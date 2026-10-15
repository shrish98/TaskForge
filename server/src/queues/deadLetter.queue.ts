import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';

// Tasks that used up their retries (or hit an error retrying can't fix) are parked here with
// the reason they failed. Nothing consumes this queue: an admin reads it and requeues tasks
// once the cause is fixed, e.g. a webhook endpoint that was down.
export const DEAD_LETTER_QUEUE_NAME = 'taskforge-dead-letter';

export interface DeadLetterEntry {
  taskId: string;
  userId: string;
  type: string;
  error: string;
  attempts: number;
  failedAt: string;
}

export const deadLetterQueue = new Queue<DeadLetterEntry>(DEAD_LETTER_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: { removeOnComplete: true },
});

export async function sendToDeadLetter(entry: Omit<DeadLetterEntry, 'failedAt'>) {
  await removeFromDeadLetter(entry.taskId);
  await deadLetterQueue.add('dead-letter', { ...entry, failedAt: new Date().toISOString() }, { jobId: entry.taskId });
}

export async function removeFromDeadLetter(taskId: string) {
  const job = await deadLetterQueue.getJob(taskId);
  if (job) await job.remove();
}

export async function listDeadLetters(page = 1, limit = 20) {
  const start = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    deadLetterQueue.getJobs(['waiting', 'paused'], start, start + limit - 1, false),
    deadLetterQueue.getJobCountByTypes('waiting', 'paused'),
  ]);
  return { data: jobs.map((j) => j.data), meta: { total, page, limit } };
}
