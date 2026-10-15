# TaskForge

[![CI](https://github.com/shrish98/TaskForge/actions/workflows/ci.yml/badge.svg)](https://github.com/shrish98/TaskForge/actions/workflows/ci.yml)

A background job platform built on Express, BullMQ and Redis. The API takes a task, a worker runs it off the request path, and the dashboard shows its progress live over Socket.IO. Failed jobs retry with backoff and, once out of attempts, land in a dead-letter queue.

**Live demo:** [task-forge-zeta-ten.vercel.app](https://task-forge-zeta-ten.vercel.app/) · demo login `user@taskforge.ai` / `UserPassword123!`

## What the jobs actually do

Every job type does real work. None of them are timers that return canned output.

| Type | What it does | Payload |
| --- | --- | --- |
| `FILE_PROCESSING` | Downloads an image and reads its text with Tesseract (OCR). | `{ "imageUrl": "https://…" }` |
| `WEB_SCRAPE` | Fetches a page and extracts its title, description, headings and links, plus the text of anything matching an optional CSS selector. | `{ "url": "https://…", "selector": "h2" }` |
| `REPORT_GENERATION` | Builds a PDF of your task history (counts by status, run times by job type, recent tasks) from Postgres. | `{}` |
| `DATA_EXPORT` | Streams your tasks out of Postgres in batches and writes a CSV, optionally filtered by status. | `{ "status": "FAILED" }` |
| `NOTIFICATION_DISPATCH` | POSTs a JSON event to a webhook, signed with HMAC-SHA256, with an `Idempotency-Key` header. | `{ "webhookUrl": "https://…", "data": {} }` |

The API validates each payload against its job type, so a bad payload gets a 400 straight away instead of failing three times in the worker. PDF and CSV files are stored with the task and downloaded from `GET /api/v1/tasks/:id/artifact`.

## The console

The dashboard is built like an ops console: dark panels, monospace for anything measured, and colour only for job state.

- **Worker timeline.** Every attempt at running a job is a block, packed into lanes so you can see how many ran at once. Retries are hatched red, final failures solid red, and running jobs grow in real time. Jobs take milliseconds to seconds, so a plain clock axis would draw them as slivers. Instead, runs close together form a burst drawn to scale, and the idle time between bursts is collapsed into a marked break (≈). The backoff gap between retries stays visible.
- **Jobs and dead letter.** Each job shows its attempts as dots (red failed, green succeeded, amber running). A side panel shows every attempt with its worker, error and timing, plus the result, any file to download, and the job's full log. Retry and delete are there too.
- **Logs.** One stream across all your jobs, filterable by level and searchable.
- **Metrics.** Queue counts, run-time percentiles by job type, and Redis stats, all measured on request.

Attempts are stored as their own rows (`TaskAttempt`), so the timeline and the side panel show real retry history rather than reconstructing it from logs.

## How a task runs

```
 POST /tasks ──► Postgres (task row) ──► BullMQ queue in Redis
                                               │
                                               ▼
                                         Worker (5 at a time)
                                               │  loads the task, runs the handler,
                                               │  writes progress + logs to Postgres
                                               ▼
                         Redis pub/sub "taskforge:task-events"
                                               │
                                               ▼
                         API ──► Socket.IO room for the task's owner ──► dashboard
```

- **The job carries only ids.** The worker reads the task from Postgres when it runs, so edits made while it waits are picked up, and a task deleted in the meantime is skipped.
- **Live updates go through Redis, not process memory.** The worker can run in another container with no Socket.IO server of its own. It publishes each change to a Redis channel, and every API instance forwards the change to the owner's room. The dashboard polls only while its socket is disconnected.
- **All database writes happen inside the job, in order,** before BullMQ marks it done. An earlier version wrote from the worker's event listeners, and a late "progress" write could land after "completed".

### Retries, the dead-letter queue and idempotency

- **Retries and backoff.** Each task gets 3 attempts with exponential backoff: 2 s, then 4 s.
- **Errors that won't fix themselves fail immediately.** A bad URL, a private address, a 404 from a webhook, or a page that isn't HTML is thrown as BullMQ's `UnrecoverableError`, which skips the remaining attempts.
- **The dead-letter queue.** After the last attempt, a task is parked in the `taskforge-dead-letter` queue with its error. Admins can list it (`GET /api/v1/system/dead-letter`) and requeue tasks (`POST /api/v1/system/dead-letter/:taskId/requeue`).
- **Manual retry starts over.** Retrying a failed task removes the old BullMQ job first, then queues the task again with a fresh set of attempts. BullMQ silently ignores `add()` while a job with the same id still exists, so before this fix retry did nothing.
- **Duplicate requests.** `POST /api/v1/tasks` accepts an `Idempotency-Key` header. A repeated request with the same key gets the original task back (`200`, `Idempotent-Replayed: true`) instead of creating a duplicate job. The key is claimed atomically with Redis `SET NX`, so concurrent duplicates also produce one task.
- **Webhook deduplication.** Webhook deliveries carry the task id as their `Idempotency-Key`, so a receiver can drop duplicates when a retry follows a delivery that landed but timed out.

### Graceful shutdown

On `SIGTERM`, the process shuts down in this order:
1. It stops accepting HTTP connections and closes the sockets.
2. It waits for running jobs to finish. `worker.close()` stops taking new jobs and waits for the active ones.
3. It closes the queues, Redis and Prisma.

A 25 s deadline forces exit. A job still running at that point isn't lost: BullMQ sees its lock expire and hands it to another worker as a stalled job.

### Security

- **SSRF protection.** Jobs fetch URLs that users type in, so every request goes through a guard:
  - http and https only;
  - each redirect hop is resolved and checked, and private, loopback, link-local and cloud-metadata addresses are refused;
  - a timeout and a size cap.
- **No self-assigned admins.** Registration always creates a regular user. An earlier version accepted `"role": "ADMIN"` from the client.
- **CSV formula injection.** CSV cells starting with `=`, `+`, `-` or `@` are prefixed with a quote, so a task title can't run as a spreadsheet formula when the export is opened.
- **Auth and access.**
  - JWT access tokens (15 min) and refresh tokens (7 days, stored in Postgres and Redis).
  - Role-based access: users see their own tasks, admins see all of them.
  - Rate limits on the API and on auth routes.

## Measured performance

From the repo's load test (`server/scripts/loadtest.ts`). It runs `GET /api/v1/tasks` with 20 concurrent connections for 15 s, once with an idle queue and once while 50 OCR jobs run on the in-process worker.

| GET /api/v1/tasks, 20 connections | requests/s | p50 | p97.5 | p99 |
| --- | --- | --- | --- | --- |
| Queue idle | 388 | 46 ms | 101 ms | 149 ms |
| 50 OCR jobs running | 310 | 60 ms | 106 ms | 131 ms |

- 50 OCR jobs drained in 16.4 s (3.05 jobs/s). Individual OCR runs: p50 670 ms, p95 2.1 s.
- Redis round trip from the API: 1.1 ms.
- Setup: a Ryzen 5 5500U laptop (12 threads), Node 22, with Postgres 16 and Redis 7 in Docker and the load generator all on the same machine. Expect different numbers on other hardware.

The API stays responsive under OCR load because Tesseract runs in its own thread: median latency rose 14 ms and p99 didn't get worse. All OCR jobs share one Tesseract worker to keep memory flat on small hosts, so OCR throughput is about one core's worth. To get more, run more worker containers.

The telemetry page in the dashboard shows the same kinds of numbers live, from `GET /api/v1/system/metrics`: queue counts, workers online, queue wait and run time percentiles, and Redis stats.

## Deployment

There are two ways to run it, and they differ:

- **The live demo** runs the API and the worker in **one process** (`RUN_WORKER_IN_API` unset) on Render, which redeploys on every push to `main`. The dashboard is on Vercel.
- **`docker compose up --build`** runs **five containers**: Postgres, Redis, the API (`RUN_WORKER_IN_API=false`), a separate worker, and the Next.js dashboard. The worker gets a 30 s stop grace period so it can finish jobs on shutdown.

Schema changes ship as Prisma migrations in `server/prisma/migrations`. Apply them with `npx prisma migrate deploy`, or `npx prisma db push` for a database that was created with `db push`.

## Running it locally

```bash
docker compose up postgres redis -d

cd server
npm install
npx prisma migrate deploy
npm run prisma:seed      # demo accounts + a few real tasks
npm run dev              # API on :5000 with the worker in-process

cd ../client
npm install
npm run dev              # dashboard on :3000
```

| Account | Email | Password |
| --- | --- | --- |
| Demo user | `user@taskforge.ai` | `UserPassword123!` |
| Admin | `admin@taskforge.ai` | `AdminPassword123!` |

Optional settings:
- `WEBHOOK_SIGNING_SECRET`: turns on webhook signatures.
- `WORKER_CONCURRENCY`: jobs per worker. Default 5.
- `JOB_BACKOFF_MS`: base retry delay. Default 2000.
- `API_RATE_LIMIT`: requests per IP per 15 minutes. Default 300.

## Tests

```bash
cd server
npm test                     # 47 unit tests: SSRF guard, scraper, CSV, signing, validation
TEST_DATABASE_URL=postgresql://…/taskforge_test TEST_REDIS_URL=redis://localhost:6379/1 \
  npm run test:integration   # 23 tests against real Postgres, Redis and a BullMQ worker
```

The integration tests run real jobs against a local fixture server. They cover:
- OCR on a fixture image;
- retries succeeding on the third attempt, recorded as three separate attempts;
- giving up, landing in the dead-letter queue, then a manual retry;
- 404s not being retried;
- idempotency under concurrent requests;
- ordered live events;
- a worker finishing its job before shutting down;
- users being kept out of each other's tasks.

They refuse to run unless the database name contains `test` and Redis uses a database other than 0, because they wipe both.

CI runs the type check, both suites (with Postgres and Redis service containers) and the Next.js production build on every push.

### Load test

```bash
# terminal 1: a throwaway database, a high rate limit, and localhost fetches allowed for the fixture image
cd server && npm run build
DATABASE_URL=… REDIS_URL=… ALLOW_PRIVATE_URLS=true API_RATE_LIMIT=10000000 PORT=5055 node dist/index.js

# terminal 2
cd server && LOADTEST_URL=http://localhost:5055 npm run loadtest
```

## API

| Method | Route | |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register`, `/login`, `/refresh-token`, `/logout` | Auth |
| `GET` | `/api/v1/auth/me` | Current user |
| `POST` | `/api/v1/tasks` | Create and queue a task (`Idempotency-Key` supported) |
| `GET` | `/api/v1/tasks` | List, with `search`, `status`, `type`, `page`, `limit` |
| `GET` | `/api/v1/tasks/:id` | Task with its logs |
| `PATCH` | `/api/v1/tasks/:id` | Edit a task that hasn't started |
| `DELETE` | `/api/v1/tasks/:id` | Delete, removing its queued job |
| `POST` | `/api/v1/tasks/:id/retry` | Re-queue a failed task |
| `GET` | `/api/v1/tasks/:id/artifact` | Download the PDF or CSV a task produced |
| `GET` | `/api/v1/tasks/stats/summary` | Counts by status |
| `GET` | `/api/v1/system/metrics` | Live queue, worker, timing and Redis metrics |
| `GET` | `/api/v1/system/timeline` | Recent attempts for the worker timeline |
| `GET` | `/api/v1/system/logs` | Log lines across your jobs (`level`, `search`, `before` cursor) |
| `GET` | `/api/v1/system/dead-letter` | Dead-letter queue (admin) |
| `POST` | `/api/v1/system/dead-letter/:taskId/requeue` | Requeue from the dead-letter queue (admin) |

## Limits and next steps

- **Artifacts in Postgres.** PDFs and CSVs are stored in Postgres as `bytea`. That's fine at this size; past a few MB per file, they belong in S3 or R2 behind presigned URLs.
- **DNS rebinding.** The SSRF guard checks the address a hostname resolves to, then lets `fetch` resolve it again. Closing that gap fully means pinning the checked address in a custom HTTP agent.
- **No cancellation.** A running job can't be cancelled; only waiting ones can, by deleting the task.
