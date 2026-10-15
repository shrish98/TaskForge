import { taskQueue } from '../../queues/task.queue';
import { api, closeAll, createTask, makeAdmin, resetState, signUp } from './helpers';

// No worker runs in this file, so queued tasks stay queued and can be inspected.

beforeEach(resetState);
afterAll(closeAll);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('auth', () => {
  it('registers a user as USER even when the request asks for ADMIN', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email: 'sneaky@test.local', password: 'password-123', name: 'Sneaky', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('USER');
  });

  it('rejects task routes without a token', async () => {
    expect((await api().get('/api/v1/tasks')).status).toBe(401);
  });
});

describe('creating tasks', () => {
  it('validates the payload against the job type', async () => {
    const { token } = await signUp();
    const res = await api()
      .post('/api/v1/tasks')
      .set(auth(token))
      .send({ title: 'Scrape it', type: 'WEB_SCRAPE', payload: { url: 'ftp://example.com' } });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('payload.url');
  });

  it('stores the task and puts exactly one job on the queue', async () => {
    const { token, user } = await signUp();
    const task = await createTask(token, { type: 'REPORT_GENERATION' });

    expect(task.status).toBe('PENDING');
    const job = await taskQueue.getJob(task.id);
    expect(job?.data).toEqual({ taskId: task.id, userId: user.id, type: 'REPORT_GENERATION' });
  });

  it('keeps users out of each other’s tasks', async () => {
    const owner = await signUp('Owner');
    const other = await signUp('Other');
    const task = await createTask(owner.token, { type: 'REPORT_GENERATION' });

    expect((await api().get(`/api/v1/tasks/${task.id}`).set(auth(other.token))).status).toBe(403);
    expect((await api().get(`/api/v1/tasks/${task.id}`).set(auth(owner.token))).status).toBe(200);
    expect((await api().delete(`/api/v1/tasks/${task.id}`).set(auth(other.token))).status).toBe(403);
  });

  it('removes the queued job when a task is deleted', async () => {
    const { token } = await signUp();
    const task = await createTask(token, { type: 'REPORT_GENERATION' });

    expect((await api().delete(`/api/v1/tasks/${task.id}`).set(auth(token))).status).toBe(200);
    expect(await taskQueue.getJob(task.id)).toBeUndefined();
  });
});

describe('Idempotency-Key', () => {
  const body = { title: 'Monthly report', type: 'REPORT_GENERATION' };

  it('returns the original task when the same request is sent again', async () => {
    const { token } = await signUp();
    const key = 'b7c1e2d4-0f5a-4c3e-9a8b-112233445566';

    const first = await api().post('/api/v1/tasks').set(auth(token)).set('Idempotency-Key', key).send(body);
    const second = await api().post('/api/v1/tasks').set(auth(token)).set('Idempotency-Key', key).send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await taskQueue.count()).toBe(1);
  });

  it('creates one task when two identical requests race', async () => {
    const { token } = await signUp();
    const key = 'race-0001-key';
    const send = () => api().post('/api/v1/tasks').set(auth(token)).set('Idempotency-Key', key).send(body);

    const results = await Promise.all([send(), send(), send()]);
    const ids = new Set(results.filter((r) => r.status < 300).map((r) => r.body.data.id));

    expect(ids.size).toBe(1);
    // A request that arrives while the first is still in flight is told to try again later.
    results.forEach((r) => expect([200, 201, 409]).toContain(r.status));
    expect(await taskQueue.count()).toBe(1);
  });

  it('scopes keys to the user', async () => {
    const a = await signUp();
    const b = await signUp();
    const key = 'shared-key-123';

    const ra = await api().post('/api/v1/tasks').set(auth(a.token)).set('Idempotency-Key', key).send(body);
    const rb = await api().post('/api/v1/tasks').set(auth(b.token)).set('Idempotency-Key', key).send(body);
    expect(rb.status).toBe(201);
    expect(rb.body.data.id).not.toBe(ra.body.data.id);
  });
});

describe('system routes', () => {
  it('reports live queue metrics', async () => {
    const { token } = await signUp();
    await createTask(token, { type: 'REPORT_GENERATION' });

    const res = await api().get('/api/v1/system/metrics').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.queue.waiting).toBe(1);
    expect(typeof res.body.data.redis.roundTripMs).toBe('number');
  });

  it('returns log lines for the caller’s own tasks only, filterable by level', async () => {
    const owner = await signUp('Owner');
    const other = await signUp('Other');
    const task = await createTask(owner.token, { title: 'Quarterly report', type: 'REPORT_GENERATION' });

    const mine = await api().get('/api/v1/system/logs').set(auth(owner.token));
    expect(mine.status).toBe(200);
    expect(mine.body.data.data[0]).toMatchObject({ level: 'INFO', message: 'Queued for a worker', task: { id: task.id } });

    const searched = await api().get('/api/v1/system/logs?search=quarterly').set(auth(owner.token));
    expect(searched.body.data.data).toHaveLength(1);
    expect((await api().get('/api/v1/system/logs?level=ERROR').set(auth(owner.token))).body.data.data).toHaveLength(0);
    expect((await api().get('/api/v1/system/logs').set(auth(other.token))).body.data.data).toHaveLength(0);
  });

  it('only lets admins read the dead-letter queue', async () => {
    const { token } = await signUp();
    const admin = await makeAdmin();
    expect((await api().get('/api/v1/system/dead-letter').set(auth(token))).status).toBe(403);
    expect((await api().get('/api/v1/system/dead-letter').set(auth(admin.token))).status).toBe(200);
  });
});
