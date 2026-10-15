import { Worker } from 'bullmq';
import { prisma } from '../../config/db';
import { createTaskWorker } from '../../worker';
import { shutdownOcr } from '../../jobs/ocr';
import { signBody } from '../../jobs/webhook';
import { subscribeTaskEvents } from '../../events/taskEvents';
import { deadLetterQueue } from '../../queues/deadLetter.queue';
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

  it('skips a job whose task was deleted while it waited', async () => {
    await worker.close();
    const task = await createTask(token, { type: 'REPORT_GENERATION' });
    await prisma.task.delete({ where: { id: task.id } }); // behind the API's back

    worker = createTaskWorker(1);
    await new Promise<void>((resolve) => worker.once('completed', () => resolve()));
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
  });
});
