import crypto from 'crypto';
import { UnrecoverableError } from 'bullmq';
import { safeFetch } from '../lib/safeFetch.js';
import { JobHandler } from './types.js';

/** Same scheme as Stripe/GitHub: hex HMAC-SHA256 of the raw body, keyed by a shared secret. */
export function signBody(body: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

// Retrying a 400 or 404 sends the same bad request again. Timeouts, rate limits and 5xx can recover.
const isPermanent = (status: number) => status >= 400 && status < 500 && status !== 408 && status !== 429;

export const runWebhook: JobHandler = async (ctx) => {
  const { webhookUrl, data = {} } = ctx.payload;
  const body = JSON.stringify({ event: 'taskforge.notification', taskId: ctx.taskId, sentAt: new Date().toISOString(), data });

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    // Every attempt for a task carries the same key, so a receiver can drop duplicate deliveries
    // when a retry follows a request that actually landed but timed out on our side.
    'idempotency-key': ctx.taskId,
  };
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (secret) headers['x-taskforge-signature'] = signBody(body, secret);

  await ctx.progress(30, `POST ${webhookUrl}`);
  const started = performance.now();
  const res = await safeFetch(webhookUrl, {
    method: 'POST',
    headers,
    body,
    timeoutMs: 10_000,
    maxBytes: 256 * 1024,
    signal: ctx.signal,
  });
  const latencyMs = Math.round(performance.now() - started);

  if (isPermanent(res.status)) {
    throw new UnrecoverableError(`Webhook rejected the delivery with HTTP ${res.status}; not retrying`);
  }
  if (!res.ok) throw new Error(`Webhook responded with HTTP ${res.status}`);

  return {
    output: {
      webhookUrl,
      httpStatus: res.status,
      latencyMs,
      signed: Boolean(secret),
      responsePreview: res.body.toString('utf8').slice(0, 500),
    },
    message: `Webhook delivered: HTTP ${res.status} in ${latencyMs} ms.`,
  };
};
