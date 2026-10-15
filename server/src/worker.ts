import { Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
import path from 'path';
import { TASK_QUEUE_NAME, TaskJobData } from './queues/task.queue.js';
import { processTaskJob } from './queues/task.processor.js';
import { redisConfig } from './config/redis.js';
import { logger } from './utils/logger.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;

export function createTaskWorker(concurrency = WORKER_CONCURRENCY) {
  const worker = new Worker<TaskJobData>(TASK_QUEUE_NAME, processTaskJob, {
    connection: redisConfig,
    concurrency,
    name: `taskforge-worker-${process.pid}`,
  });

  worker.on('active', (job: Job<TaskJobData>) => {
    logger.info(`[Worker] Job ${job.id} (${job.data.type}) started, attempt ${job.attemptsMade + 1}`);
  });
  worker.on('completed', (job: Job<TaskJobData>) => {
    logger.info(`[Worker] Job ${job.id} completed`);
  });
  worker.on('failed', (job: Job<TaskJobData> | undefined, err: Error) => {
    logger.warn(`[Worker] Job ${job?.id} failed on attempt ${job?.attemptsMade}: ${err.message}`);
  });
  worker.on('error', (err) => logger.error(`[Worker] ${err.message}`));

  logger.info(`[Worker] Listening on ${TASK_QUEUE_NAME} with concurrency ${concurrency}`);
  return worker;
}

// Run on its own (`node dist/worker.js`, the worker container). When the API imports this file
// to run the worker in-process, index.ts owns startup and shutdown instead.
if (require.main === module) {
  void (async () => {
    const { registerShutdown } = await import('./lifecycle.js');
    const worker = createTaskWorker();
    registerShutdown({ worker });
  })();
}
