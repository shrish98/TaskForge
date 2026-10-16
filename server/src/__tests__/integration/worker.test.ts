import { Worker } from 'bullmq';
import { prisma } from '../../config/db';
import { redisConfig } from '../../config/redis';
import { createTaskWorker } from '../../worker';
import { jobTimeoutsMs } from '../../jobs';
import { shutdownOcr } from '../../jobs/ocr';
import { signBody } from '../../jobs/webhook';
import { subscribeTaskEvents } from '../../events/taskEvents';
import { deadLetterQueue } from '../../queues/deadLetter.queue';
import { TASK_QUEUE_NAME, TaskJobData, taskQueue } from '../../queues/task.queue';
import { sweepLostTasks } from '../../queues/recovery';
import { taskRepository } from '../../repositories/task.repository';
import { api, closeAll, createTask, Fixture, makeAdmin, resetState, signUp, startFixtureServer, waitForTask } from './helpers';

// A real BullMQ worker processes real jobs here, against a local fixture server.

let worker: Worker;
let fixture: Fixture;
let token: string;

beforeAll(async () => {
  fixture = await startFixtureServer();
});

beforeEach(async () => {
  await resetState();
  fixture.hits.length = 0;
  fixture.flaky.clear();
  worker = createTaskWorker(3);
  ({ token } = await signUp());
});

afterEach(async () => {
  await worker.close();
});

afterAll(async () => {
  await shutdownOcr();
  await fixture.close();
  await closeAll();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('jobs do real work', () => {
  it('scrapes a page', async () => {
    const task = await createTask(token, {
      type: 'WEB_SCRAPE',
      payload: { url: `${fixture.url}/page.html`, selector: '.price' },
    });
    const done = await waitForTask(task.id);

    expect(done.status).toBe('COMPLETED');
    expect(done.progress).toBe(100);
    expect(done.startedAt).not.toBeNull();
    expect(done.result).toMatchObject({ title: 'Fixture shop', headings: ['Deals'], matches: ['₹999'], linkCount: 1 });
  });

  it('reads the text in an image with OCR', async () => {
    const task = await createTask(token, { type: 'FILE_PROCESSING', payload: { imageUrl: `${fixture.url}/invoice.png` } });
    const done = await waitForTask(task.id, 90_000);

    expect(done.status).toBe('COMPLETED');
    const result = done.result as { text: string; confidence: number };
    expect(result.text).toMatch(/TaskForge reads this invoice/i);
    expect(result.text).toMatch(/1450/);
    expect(result.confidence).toBeGreaterThan(70);
  }, 120_000);

  it('exports the user’s tasks as a downloadable CSV', async () => {
    await createTask(token, { title: 'Comma, "quoted" title', type: 'REPORT_GENERATION' });
    const task = await createTask(token, { type: 'DATA_EXPORT' });
    await waitForTask(task.id);

    const res = await api().get(`/api/v1/tasks/${task.id}/artifact`).set(auth());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="taskforge-tasks-.*\.csv"/);
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('id,title,type,status,priority,attempts,progress,createdAt,startedAt,completedAt,failedAt,runMs,error');
    expect(res.text).toContain('"Comma, ""quoted"" title"');
  });

  it('renders a PDF report', async () => {
    const task = await createTask(token, { type: 'REPORT_GENERATION' });
    const done = await waitForTask(task.id);
    expect(done.status).toBe('COMPLETED');

    const res = await api()
      .get(`/api/v1/tasks/${task.id}/artifact`)
      .set(auth())
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.headers['content-type']).toBe('application/pdf');
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('delivers a signed webhook with an idempotency key', async () => {
    const task = await createTask(token, {
      type: 'NOTIFICATION_DISPATCH',
      payload: { webhookUrl: `${fixture.url}/flaky/signed`, data: { order: 42 } },
    });
    await waitForTask(task.id);

    const hit = fixture.hits.find((h) => h.path === '/flaky/signed')!;
    expect(JSON.parse(hit.body)).toMatchObject({ taskId: task.id, data: { order: 42 } });
    expect(hit.headers['idempotency-key']).toBe(task.id);
    expect(hit.headers['x-taskforge-signature']).toBe(signBody(hit.body, 'integration-test-webhook-secret'));
  });
});

describe('retries and the dead-letter queue', () => {
  it('retries with backoff and succeeds on the third attempt', async () => {
    fixture.flaky.set('twice', [503, 503]);
    const task = await createTask(token, { type: 'NOTIFICATION_DISPATCH', payload: { webhookUrl: `${fixture.url}/flaky/twice` } });
    const done = await waitForTask(task.id);

    expect(done.status).toBe('COMPLETED');
    expect(done.attempts).toBe(3);
    expect(done.taskLogs.filter((l) => l.level === 'WARN')).toHaveLength(2);

    // Each attempt is its own run on the worker timeline, with the backoff gap between them.
    const timeline = await api().get('/api/v1/system/timeline').set(auth());
    const runs = timeline.body.data.filter((r: { task: { id: string } }) => r.task.id === task.id);
    expect(runs.map((r: { number: number; outcome: string }) => [r.number, r.outcome])).toEqual([
      [1, 'FAILED'],
      [2, 'FAILED'],
      [3, 'COMPLETED'],
    ]);
    expect(runs[0].error).toMatch(/HTTP 503/);
    expect(new Date(runs[1].startedAt).getTime()).toBeGreaterThanOrEqual(new Date(runs[0].endedAt).getTime());
    // Every attempt carried the same idempotency key, so the receiver can dedupe.
    const keys = fixture.hits.filter((h) => h.path === '/flaky/twice').map((h) => h.headers['idempotency-key']);
    expect(keys).toEqual([task.id, task.id, task.id]);
  });

  it('gives up after three attempts, parks the task, and a manual retry runs it again', async () => {
    fixture.flaky.set('down', [500, 500, 500]);
    const task = await createTask(token, { type: 'NOTIFICATION_DISPATCH', payload: { webhookUrl: `${fixture.url}/flaky/down` } });
    const failed = await waitForTask(task.id);

    expect(failed.status).toBe('FAILED');
    expect(failed.attempts).toBe(3);
    expect(failed.error).toMatch(/HTTP 500/);
    expect((await deadLetterQueue.getJob(task.id))?.data).toMatchObject({ taskId: task.id, attempts: 3 });

    const admin = await makeAdmin();
    const list = await api().get('/api/v1/system/dead-letter').set({ Authorization: `Bearer ${admin.token}` });
    expect(list.body.data.data.map((d: { taskId: string }) => d.taskId)).toEqual([task.id]);

    // The endpoint is back up. Retrying used to do nothing because the old failed job still
    // held the job id; now it runs again with a fresh set of attempts.
    const retry = await api().post(`/api/v1/tasks/${task.id}/retry`).set(auth());
    expect(retry.status).toBe(200);
    const done = await waitForTask(task.id);

    expect(done.status).toBe('COMPLETED');
    expect(done.attempts).toBe(1);
    expect(await deadLetterQueue.getJob(task.id)).toBeUndefined();
  });

  it('does not retry errors that cannot succeed', async () => {
    const task = await createTask(token, { type: 'NOTIFICATION_DISPATCH', payload: { webhookUrl: `${fixture.url}/missing` } });
    const done = await waitForTask(task.id);

    expect(done.status).toBe('FAILED');
    expect(done.attempts).toBe(1);
    expect(done.error).toMatch(/HTTP 404; not retrying/);
  });
});

describe('the worker in production conditions', () => {
  it('publishes progress events in order, ending in COMPLETED', async () => {
    const events: Array<{ taskId: string; status: string; progress: number }> = [];
    await subscribeTaskEvents((e) => events.push(e));

    const task = await createTask(token, { type: 'WEB_SCRAPE', payload: { url: `${fixture.url}/page.html` } });
    await waitForTask(task.id);
    await new Promise((r) => setTimeout(r, 100));

    const mine = events.filter((e) => e.taskId === task.id);
    expect(mine[0].status).toBe('PENDING');
    expect(mine[mine.length - 1]).toMatchObject({ status: 'COMPLETED', progress: 100 });
    const progress = mine.filter((e) => e.status === 'PROCESSING').map((e) => e.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
  });

  it('finishes a running job before shutting down', async () => {
    const task = await createTask(token, { type: 'NOTIFICATION_DISPATCH', payload: { webhookUrl: `${fixture.url}/slow` } });
    while ((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status !== 'PROCESSING') {
      await new Promise((r) => setTimeout(r, 20));
    }

    await worker.close(); // what SIGTERM does
    const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(after.status).toBe('COMPLETED');
  });

  it('aborts an attempt that runs past its time limit and retries it', async () => {
    const limit = jobTimeoutsMs.NOTIFICATION_DISPATCH;
    jobTimeoutsMs.NOTIFICATION_DISPATCH = 300;
    try {
      const task = await createTask(token, { type: 'NOTIFICATION_DISPATCH', payload: { webhookUrl: `${fixture.url}/hang` } });
      const done = await waitForTask(task.id);

      expect(done.status).toBe('FAILED');
      expect(done.attempts).toBe(3);
      expect(done.error).toBe('Timed out after 0.3s');
      expect(done.taskLogs.filter((l) => l.level === 'WARN')).toHaveLength(2);
      const runs = await prisma.taskAttempt.findMany({ where: { taskId: task.id } });
      expect(runs.map((r) => r.outcome)).toEqual(['FAILED', 'FAILED', 'FAILED']);
      expect(await deadLetterQueue.getJob(task.id)).toBeDefined();
    } finally {
      jobTimeoutsMs.NOTIFICATION_DISPATCH = limit;
    }
  });

  it('skips a job whose task was deleted while it waited', async () => {
    await worker.close();
    const task = await createTask(token, { type: 'REPORT_GENERATION' });
    await prisma.task.delete({ where: { id: task.id } }); // behind the API's back

    worker = createTaskWorker(1);
    await new Promise<void>((resolve) => worker.once('completed', () => resolve()));
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
  });
});

describe('a worker that dies mid-job', () => {
  // Stands in for a worker process that crashes: it starts the attempt the way processTaskJob
  // does, then never finishes. Force-closing it stops its lock renewals, as a crash would.
  async function crashMidJob(taskId: string) {
    let started!: () => void;
    const running = new Promise<void>((r) => (started = r));
    const doomed = new Worker<TaskJobData>(
      TASK_QUEUE_NAME,
      async (job) => {
        await taskRepository.markStarted(job.data.taskId, job.attemptsMade + 1);
        await taskRepository.startAttempt(job.data.taskId, job.attemptsMade + 1, 'doomed-worker');
        started();
        await new Promise(() => undefined);
      },
      // skipStalledCheck: stall checks are throttled queue-wide, and this worker's 30 s default
      // interval would hold off the fast checks of the worker that takes over.
      { connection: redisConfig, lockDuration: 300, skipStalledCheck: true }
    );
    await running;
    await doomed.close(true);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: taskId } })).status).toBe('PROCESSING');
  }

  const fastStallCheck = { lockDuration: 300, stalledInterval: 200 };

  beforeEach(async () => {
    // The default worker ran a stall check on start, which throttles the next one for 30 s.
    await worker.close();
    await (await taskQueue.client).del(taskQueue.keys['stalled-check']);
  });

  it('hands the job to another worker and closes the dead attempt', async () => {
    const task = await createTask(token, { type: 'REPORT_GENERATION' });
    await crashMidJob(task.id);

    worker = createTaskWorker(1, fastStallCheck);
    const done = await waitForTask(task.id);

    expect(done.status).toBe('COMPLETED');
    const runs = await prisma.taskAttempt.findMany({ where: { taskId: task.id }, orderBy: { startedAt: 'asc' } });
    expect(runs.map((r) => [r.worker === 'doomed-worker', r.outcome])).toEqual([
      [true, 'FAILED'],
      [false, 'COMPLETED'],
    ]);
    expect(runs[0].error).toMatch(/stopped responding/);
    expect(runs[0].endedAt).not.toBeNull();
  });

  it('fails the task when the job stalls past the limit, instead of leaving it PROCESSING', async () => {
    const task = await createTask(token, { type: 'REPORT_GENERATION' });
    await crashMidJob(task.id);

    worker = createTaskWorker(1, { ...fastStallCheck, maxStalledCount: 0 });
    const done = await waitForTask(task.id);

    expect(done.status).toBe('FAILED');
    expect(done.error).toMatch(/stopped responding more than once/);
    expect(done.taskLogs.some((l) => l.level === 'ERROR' && /dead-letter/.test(l.message))).toBe(true);
    expect(await prisma.taskAttempt.count({ where: { taskId: task.id, outcome: 'RUNNING' } })).toBe(0);
    expect((await deadLetterQueue.getJob(task.id))?.data).toMatchObject({ taskId: task.id });
  });

  it('sweeps up a task whose job vanished from the queue', async () => {
    const task = await createTask(token, { type: 'REPORT_GENERATION', scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    const scheduled = await createTask(token, { type: 'REPORT_GENERATION', scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    await (await taskQueue.getJob(task.id))!.remove(); // Redis lost it

    expect(await sweepLostTasks(0)).toBe(1);
    const lost = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(lost.status).toBe('FAILED');
    expect(lost.error).toBe('The job was lost from the queue');
    // A task still waiting on its job is left alone, however long it has been quiet.
    expect((await prisma.task.findUniqueOrThrow({ where: { id: scheduled.id } })).status).toBe('PENDING');
    expect(await sweepLostTasks(0)).toBe(0);
  });
});
