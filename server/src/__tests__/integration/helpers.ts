import fs from 'fs';
import http from 'http';
import path from 'path';
import { AddressInfo } from 'net';
import { Task, TaskStatus } from '@prisma/client';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { taskQueue } from '../../queues/task.queue';
import { deadLetterQueue } from '../../queues/deadLetter.queue';
import { closeTaskEvents } from '../../events/taskEvents';
import { TokenUtils } from '../../utils/token.utils';

export const api = () => request(app);

export async function resetState() {
  await taskQueue.obliterate({ force: true });
  await deadLetterQueue.obliterate({ force: true });
  await prisma.taskArtifact.deleteMany();
  await prisma.taskLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  for (const key of await redis.keys('idempotency:*')) await redis.del(key);
}

export async function closeAll() {
  await Promise.all([taskQueue.close(), deadLetterQueue.close(), closeTaskEvents()]);
  await redis.quit();
  await prisma.$disconnect();
}

let userCount = 0;

/** Registers a user through the API and returns a bearer token for them. */
export async function signUp(name = 'Test User') {
  const email = `user${++userCount}-${Date.now()}@test.local`;
  const res = await api().post('/api/v1/auth/register').send({ email, password: 'password-123', name });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.accessToken as string, user: res.body.data.user as { id: string; role: string } };
}

export async function makeAdmin() {
  const user = await prisma.user.create({
    data: { email: `admin-${Date.now()}@test.local`, passwordHash: 'x', name: 'Admin', role: 'ADMIN' },
  });
  return { token: TokenUtils.generateAccessToken({ userId: user.id, email: user.email, role: 'ADMIN' }), user };
}

export async function createTask(token: string, body: Record<string, unknown>) {
  const res = await api().post('/api/v1/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Test task', ...body });
  if (res.status !== 201) throw new Error(`create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data as Task;
}

/** Polls Postgres until the task reaches COMPLETED or FAILED. */
export async function waitForTask(id: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const task = await prisma.task.findUnique({ where: { id }, include: { taskLogs: { orderBy: { createdAt: 'asc' } } } });
    if (task && (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED)) return task;
    if (Date.now() > deadline) throw new Error(`task ${id} still ${task?.status} after ${timeoutMs} ms`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

export interface Fixture {
  url: string;
  /** Requests the fixture server received, newest last. */
  hits: Array<{ path: string; headers: http.IncomingHttpHeaders; body: string }>;
  /** Status codes /flaky/:id returns in order; once used up it returns 200. */
  flaky: Map<string, number[]>;
  close(): Promise<void>;
}

const OCR_IMAGE = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'ocr-sample.png'));

/** A local site for jobs to fetch: an HTML page, an image, and endpoints that fail on cue. */
export async function startFixtureServer(): Promise<Fixture> {
  const hits: Fixture['hits'] = [];
  const flaky = new Map<string, number[]>();

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const url = req.url ?? '/';
      hits.push({ path: url, headers: req.headers, body });

      if (url === '/page.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<html><head><title>Fixture shop</title></head><body><h1>Deals</h1><p class="price">₹999</p><a href="/a">a</a></body></html>');
      } else if (url === '/invoice.png') {
        res.writeHead(200, { 'content-type': 'image/png' });
        res.end(OCR_IMAGE);
      } else if (url.startsWith('/flaky/')) {
        const queue = flaky.get(url.slice('/flaky/'.length)) ?? [];
        const status = queue.shift() ?? 200;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status }));
      } else if (url.startsWith('/slow')) {
        setTimeout(() => {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{"ok":true}');
        }, 800);
      } else {
        res.writeHead(404);
        res.end('not found');
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    hits,
    flaky,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
