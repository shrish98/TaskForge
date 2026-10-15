/**
 * Does the API stay fast while workers are busy with CPU-heavy jobs?
 *
 *   1. Baseline: hammer GET /api/v1/tasks with autocannon while the queue is idle.
 *   2. Queue a batch of OCR jobs, then run the same load while they are processed.
 *   3. Report latency for both runs and how long the batch took to drain.
 *
 * Run it against a local API started with ALLOW_PRIVATE_URLS=true (the OCR image is served from
 * localhost) and a high API_RATE_LIMIT. See "Load test" in the README for the exact commands.
 */
import autocannon from 'autocannon';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { AddressInfo } from 'net';

const API = process.env.LOADTEST_URL || 'http://localhost:5000';
const JOBS = Number(process.env.LOADTEST_JOBS) || 50;
const DURATION = Number(process.env.LOADTEST_SECONDS) || 15;
const CONNECTIONS = Number(process.env.LOADTEST_CONNECTIONS) || 20;

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${json.message}`);
  return json.data;
}

function serveImage(): Promise<{ url: string; close: () => void }> {
  const image = fs.readFileSync(path.join(__dirname, '..', 'src', '__tests__', 'fixtures', 'ocr-sample.png'));
  const server = http.createServer((_, res) => {
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(image);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/invoice.png`, close: () => server.close() })
    )
  );
}

async function hammer(token: string) {
  const result = await autocannon({
    url: `${API}/api/v1/tasks?limit=10`,
    headers: { authorization: `Bearer ${token}` },
    connections: CONNECTIONS,
    duration: DURATION,
  });
  if (result.non2xx > 0) throw new Error(`${result.non2xx} non-2xx responses; is API_RATE_LIMIT high enough?`);
  return {
    requests: result.requests.total,
    rps: Math.round(result.requests.average),
    p50: result.latency.p50,
    p97_5: result.latency.p97_5,
    p99: result.latency.p99,
  };
}

async function main() {
  const image = await serveImage();
  const email = `loadtest-${Date.now()}@test.local`;
  const { accessToken: token } = await call('POST', '/api/v1/auth/register', undefined, {
    email,
    password: 'loadtest-password',
    name: 'Load Test',
  });

  console.log(`Baseline: ${CONNECTIONS} connections for ${DURATION}s against an idle queue…`);
  const idle = await hammer(token);

  console.log(`Queueing ${JOBS} OCR jobs…`);
  const started = Date.now();
  const ids: string[] = [];
  for (let i = 0; i < JOBS; i++) {
    const task = await call('POST', '/api/v1/tasks', token, {
      title: `Load test OCR ${i + 1}`,
      type: 'FILE_PROCESSING',
      payload: { imageUrl: image.url },
    });
    ids.push(task.id);
  }

  console.log(`Same load while the workers run them…`);
  const busy = await hammer(token);

  let drainedAt = 0;
  for (;;) {
    const tasks = await Promise.all(ids.map((id) => call('GET', `/api/v1/tasks/${id}`, token)));
    const pending = tasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING').length;
    if (pending === 0) {
      drainedAt = Date.now();
      const failed = tasks.filter((t) => t.status === 'FAILED');
      if (failed.length) console.warn(`${failed.length} OCR jobs failed, e.g. ${failed[0].error}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  image.close();

  const metrics = await call('GET', '/api/v1/system/metrics', token);
  const drainSeconds = (drainedAt - started) / 1000;

  console.log(`\nMachine: ${os.cpus()[0].model}, ${os.cpus().length} threads, Node ${process.version}`);
  console.log(`\n| GET /api/v1/tasks, ${CONNECTIONS} connections | requests/s | p50 | p97.5 | p99 |`);
  console.log('| --- | --- | --- | --- | --- |');
  console.log(`| Queue idle | ${idle.rps} | ${idle.p50} ms | ${idle.p97_5} ms | ${idle.p99} ms |`);
  console.log(`| ${JOBS} OCR jobs running | ${busy.rps} | ${busy.p50} ms | ${busy.p97_5} ms | ${busy.p99} ms |`);
  console.log(`\n${JOBS} OCR jobs drained in ${drainSeconds.toFixed(1)} s (${(JOBS / drainSeconds).toFixed(2)} jobs/s).`);
  console.log(`OCR run time p50 ${metrics.timings.runByType.FILE_PROCESSING.p50Ms} ms, p95 ${metrics.timings.runByType.FILE_PROCESSING.p95Ms} ms.`);
  console.log(`Redis round trip from the API: ${metrics.redis.roundTripMs} ms.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
