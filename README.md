# 🚀 TaskForge - Distributed Task Automation & Real-Time Job Processing Engine

[![CI/CD Pipeline](https://github.com/shrish98/TaskForge/actions/workflows/ci.yml/badge.svg)](https://github.com/shrish98/TaskForge/actions/workflows/ci.yml)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![Next.js Version](https://img.shields.io/badge/next.js-v15-blue)
![TypeScript](https://img.shields.io/badge/typescript-v5-blue)
![Docker](https://img.shields.io/badge/docker-ready-cyan)
![License](https://img.shields.io/badge/license-MIT-green)

> Production-ready **Micro-SaaS Asynchronous Task Processing Platform** built with Node.js, Express, TypeScript, BullMQ, Redis, PostgreSQL, Prisma ORM, Socket.IO WebSockets, and Next.js 15 (App Router).

---

## 🌟 Executive Overview

TaskForge solves the challenge of handling heavy or time-consuming background operations (such as image compression, video transcoding, OCR extraction, web scraping, PDF report generation, and batch email dispatching) without blocking HTTP API request threads.

### Key Capabilities:
- ⚡ **Non-Blocking Architecture**: Express API Gateway offloads heavy workloads to dedicated Redis-backed BullMQ Workers.
- 🔄 **Real-Time Telemetry**: Socket.IO WebSockets broadcast live job progress (`0%` ➔ `100%`), state transitions (`PENDING` ➔ `PROCESSING` ➔ `COMPLETED` / `FAILED`), and audit logs directly to connected user browser sessions without polling.
- 🛡️ **Enterprise Security**: Dual-token JWT Authentication (15-min Access Tokens + 7-day Refresh Tokens stored in Redis & DB), password hashing with `bcrypt`, and Role-Based Access Control (`USER` / `ADMIN`).
- 🔄 **Resilient Execution**: Automatic exponential backoff retries (max 3 attempts), delay scheduling, priority queueing (P1–P4), and step-by-step audit log trails (`TaskLog`).
- 🎨 **Executive UI & SaaS Landing Page**: Next.js 15 App Router frontend with a high-conversion SaaS product landing page, glassmorphic dark theme (`#090d16`), Redux Toolkit global state, TanStack Query v5 cache management, and 5 interactive sidebar telemetry views.

---

## 🛠️ Complete Technology Stack

| Layer | Technology | Key Function / Role |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router) | Server Component SSR, Client Hydration, Routing, SaaS Landing Page |
| **Global State** | Redux Toolkit | User session management, token persistence |
| **Server State** | TanStack Query v5 | Data fetching, background refetching, user-scoped cache keys |
| **Styling** | Tailwind CSS + Lucide Icons | Dark theme palette (`#090d16`), glassmorphism, micro-animations |
| **Backend Framework** | Express.js & Node.js 20 | REST API Gateway, Routing, Socket Server Host |
| **Language** | TypeScript 5 | Strict type safety across client and server |
| **Database & ORM** | PostgreSQL 16 & Prisma | Relational entity storage, indexes, schema migrations, type-safe queries |
| **Async Queue** | Redis 7 & BullMQ | Asynchronous job queues, workers, delayed execution, backoff retries |
| **Real-Time** | Socket.IO | WebSockets engine emitting live progress % and task status updates |
| **Security** | JWT + bcrypt | Dual-token authentication with Redis refresh token invalidation & RBAC |
| **DevOps & Testing** | Docker & GitHub Actions | Multi-container orchestration, Jest unit testing, CI build validation |

---

## 🚀 Quick Start Guide (Testing Locally)

Follow either **Option A** (Standard Local Dev Setup) or **Option B** (1-Command Docker Setup) to test TaskForge on your local machine.

---

### Option A: Standard Local Setup (Recommended for Developers)

#### 1. System Requirements
- [Node.js v20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/) (running in background)
- Git

#### 2. Clone Repository & Install Dependencies
```bash
# Clone repository
git clone https://github.com/shrish98/TaskForge.git
cd TaskForge

# Install root monorepo runner dependencies
npm install
```

#### 3. Start PostgreSQL & Redis Containers
Ensure Docker Desktop is open, then start the containerized databases:
```bash
docker compose up postgres redis -d
```
*This starts PostgreSQL on `localhost:5432` and Redis on `localhost:6379`.*

#### 4. Run Database Schema Migrations & Seed Users (First Time Only)
Run the following to initialize the PostgreSQL schema and populate demo accounts:
```bash
cd server
npx prisma migrate dev --name init
npm run prisma:seed
cd ..
```

#### 5. Start All Application Services with 1 Command
From the root directory, run:
```bash
npm run dev
```

*This single command starts all 3 application services concurrently using `concurrently`:*
- 🌐 **Client (Next.js)**: `http://localhost:3000`
- ⚡ **Server (Express API)**: `http://localhost:5000`
- ⚙️ **Worker (BullMQ Task Processor)**: Running background queue loop

---

### Option B: 1-Command Docker Setup (100% Containerized)

If you don't want to install Node.js dependencies locally and want Docker to run the entire stack:

```bash
git clone https://github.com/shrish98/TaskForge.git
cd TaskForge
docker compose up --build
```

*Docker Compose will build and orchestrate all 5 microservice containers (Postgres, Redis, Server API, Worker Process, and Client Dashboard) automatically!*

---

## 🧪 How to Test Features Step-by-Step

Once `npm run dev` is running, open **[`http://localhost:3000`](http://localhost:3000)** in your browser to test the platform:

### 1. ✨ Explore the SaaS Landing Page
- Open `http://localhost:3000` when signed out.
- Experience the product landing page featuring a live interactive worker terminal simulation, telemetry statistics, code integration tabs, and developer FAQs.

### 2. 📝 Register a New User Account
- Click **Get Started Free** or navigate to `http://localhost:3000/register`.
- Create a new account with your name, email, and password.

### 3. 👤 Test Asynchronous Task Dispatching & Real-Time WebSockets
- Sign in as **Demo User** (`user@taskforge.ai` / `UserPassword123!`).
- Click the indigo **`+ Create Task`** button in the top right.
- Fill out the form:
  - **Task Title**: `Generate Q3 Sales Invoice`
  - **Task Type**: `REPORT_GENERATION` (or `FILE_PROCESSING`, `DATA_EXPORT`, `WEB_SCRAPE`, `NOTIFICATION_DISPATCH`)
  - **Priority**: `P2 - High Priority`
- Click **`Dispatch Task`**.
- **Watch Live Progress**: Your task immediately appears in the queue. Observe the status shift live (`PENDING` ➔ `PROCESSING` ➔ `COMPLETED`) and the progress bar fill from **`0%` to `100%`** in real time via Socket.IO WebSockets!
- **View Execution Audit Logs**: Click the **Eye (View Logs)** icon in the task row to inspect step-by-step audit logs and output payload URLs.

### 4. 🛡️ Test Admin Multi-Tenant Oversight
- Sign out and sign in with the **Admin Account** (`admin@taskforge.ai` / `AdminPassword123!`).
- Notice the purple **"Global Admin Oversight Active"** banner.
- As an Admin, you gain global visibility to view tasks created by **all users** across the platform, complete with a dedicated **Task Owner** column.
- Click **Retry** on any failed job across system queues.

### 5. 📊 Test Interactive Sidebar Views
Click through the left navigation menu:
- 📊 **Dashboard**: Executive metric cards & interactive Task Queue table.
- 📋 **Task Queue**: Full-width focused task management table.
- ⚡ **BullMQ Telemetry**: Live worker pool load distribution graph, Redis transport latency (< 1.8ms), memory stats, and operations/sec metrics.
- 📜 **Task Logs**: Searchable audit console with level filters (`ALL`, `INFO`, `WARN`, `ERROR`).
- ⚙️ **System Config**: Queue settings, worker concurrency thread sliders, and infrastructure health parameters.

---

## 🗝️ Default Pre-Seeded Accounts

| Account Role | Email Address | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| 👤 **Demo User** | `user@taskforge.ai` | `UserPassword123!` | Personal queue isolation, create/manage own background tasks |
| 🛡️ **Admin User** | `admin@taskforge.ai` | `AdminPassword123!` | System-wide access, global metrics, view/retry all user tasks |

---

## 📡 API Reference Endpoint Summary

### Authentication Routes (`/api/v1/auth`)
- `POST /api/v1/auth/register`: Create a new user account.
- `POST /api/v1/auth/login`: Authenticate credentials & receive Access + Refresh tokens.
- `POST /api/v1/auth/refresh-token`: Refresh Access Token using valid Refresh Token.
- `POST /api/v1/auth/logout`: Revoke Refresh Token & invalidate Redis session.
- `GET /api/v1/auth/me`: Fetch authenticated user profile (`Bearer` token required).

### Task Queue Routes (`/api/v1/tasks`)
- `POST /api/v1/tasks`: Dispatch new background task (Supports scheduling & JSON payload).
- `GET /api/v1/tasks`: User-scoped or Admin-global paginated task list (Supports `search`, `status`, `type`, `page`, `limit`).
- `GET /api/v1/tasks/:id`: Fetch single task details with execution audit logs (`TaskLog`).
- `PATCH /api/v1/tasks/:id`: Update task parameters before processing.
- `DELETE /api/v1/tasks/:id`: Cancel & delete task from database.
- `POST /api/v1/tasks/:id/retry`: Re-queue a `FAILED` task for background worker retry.
- `GET /api/v1/tasks/stats/summary`: Aggregate metrics for dashboard cards.

---

## 🏗️ Project Directory Structure

```
TaskForge/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automated GitHub Actions CI/CD Pipeline
├── docker-compose.yml         # Multi-container orchestrator (Postgres, Redis, Server, Worker, Client)
├── package.json               # Root monorepo runner with concurrently & clean scripts
├── README.md                  # System Documentation
├── server/                    # Express API Gateway & BullMQ Async Worker
│   ├── Dockerfile             # API Gateway container image
│   ├── Dockerfile.worker      # BullMQ Worker container image
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── prisma/
│   │   ├── schema.prisma      # PostgreSQL Schema (User, Task, RefreshToken, TaskLog)
│   │   └── seed.ts            # Database Seeding Script
│   └── src/
│       ├── index.ts           # Express API & Socket.IO Entrypoint
│       ├── worker.ts          # Standalone Queue Worker Entrypoint
│       ├── config/            # Database & Redis Configurations
│       ├── controllers/       # HTTP Request Handlers
│       ├── middlewares/       # AuthGuard, RateLimiter, ErrorHandler
│       ├── queues/            # BullMQ Task Queue & Processor Simulations
│       ├── repositories/      # Decoupled Prisma Data Access Layer
│       ├── routes/            # Express Endpoint Routers
│       ├── services/          # Business Logic (Task, Auth)
│       └── socket/            # Socket.IO Real-Time Engine
└── client/                    # Next.js 15 Micro-SaaS Frontend
    ├── Dockerfile             # Next.js standalone container image
    ├── package.json
    └── src/
        ├── app/               # Next.js 15 App Router (/login, /register, /)
        ├── components/        # Glassmorphic UI Primitives, LandingPage, Telemetry, AuditLogs, Config
        ├── hooks/             # Custom useSocket Real-Time Hook
        ├── lib/               # Axios Instance with Refresh Interceptor
        ├── providers/         # Redux + TanStack Query Combined Provider
        └── store/             # Redux Toolkit Store & Auth Slice
```

---

## 🔄 CI/CD Pipeline & Automated Testing

This repository includes a GitHub Actions Workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) that automatically:
1. Runs backend TypeScript type checking (`npx tsc --noEmit`) and Jest unit test suite (`npm test`).
2. Runs Next.js frontend compilation & production build verification (`npm run build`).
3. Validates Docker Compose container build integrity.

To execute tests and verification locally:
```bash
# Run backend Jest unit tests
cd server
npm test

# Run backend TypeScript typecheck
npx tsc --noEmit

# Run frontend production build
cd ../client
npm run build
```

---

## 💡 Engineering Decisions, Assumptions & Trade-Offs

### 1. Architectural Decisions
- **Decoupled Worker Process**: Separated the Express API Gateway (`index.ts`) from the BullMQ Queue Processor (`worker.ts`) to ensure background tasks do not block CPU execution or thread event loops during heavy file/data computations.
- **Repository Pattern**: Decoupled Prisma ORM database queries into dedicated repositories (`task.repository.ts`, `auth.repository.ts`) to adhere to SOLID principles and simplify unit test mocking.
- **User-Scoped Query Keys**: Embedded `user.id` and `user.role` into React Query cache keys to ensure instant state invalidation when switching sessions without requiring manual page reloads.

### 2. Key Assumptions
- **Redis Availability**: Assumed Redis 7 is available for both BullMQ task queue storage and Socket.IO Pub/Sub adapter broadcasting.
- **Task Payload Storage**: Assumed JSON payload format for task parameters (e.g., URLs, file references, export options).

### 3. Trade-Offs & Future Improvements
- **Blob Storage**: Currently simulates file processing by returning download URLs. Production implementation would integrate AWS S3 / Cloudflare R2 presigned URLs.
- **Dead Letter Queue (DLQ)**: Tasks that fail after max 3 retries are assigned status `FAILED` and recorded in `TaskLog`. Future enhancements can add a dedicated DLQ inspection UI.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
