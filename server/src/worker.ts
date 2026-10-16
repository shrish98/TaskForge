import { Worker, Job, WorkerOptions } from 'bullmq';
import dotenv from 'dotenv';
import path from 'path';
import { TASK_QUEUE_NAME, TaskJobData } from './queues/task.queue.js';
import { processTaskJob } from './queues/task.processor.js';
import { describeFailure, failAbandonedTask, sweepLostTasks } from './queues/recovery.js';
import { taskRepository } from './repositories/task.repository.js';
import { redisConfig } from './config/redis.js';
import { logger } from './utils/logger.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;

// Every few minutes, look for tasks that have been quiet for a while and have no live job.
const SWEEP_INTERVAL_MS = 5 * 60_000;
const SWEEP_QUIET_MS = 15 * 60_000;

type WorkerOverrides = Pick<WorkerOptions, 'lockDuration' | 'stalledInterval' | 'maxStalledCount'>;

export function createTaskWorker(concurrency = WORKER_CONCURRENCY, overrides: WorkerOverrides = {}) {
  const worker = new Worker<TaskJobData>(TASK_QUEUE_NAME, processTaskJob, {
    connection: redisConfig,
    concurrency,
    name: `taskforge-worker-${process.pid}`,
    ...overrides,
  });

  worker.on('active', (job: Job<TaskJobData>) => {
    logger.info(`[Worker] Job ${job.id} (${job.data.type}) started, attempt ${job.attemptsMade + 1}`);
  });
  worker.on('completed', (job: Job<TaskJobData>) => {
    logger.info(`[Worker] Job ${job.id} completed`);
  });
  worker.on('failed', (job: Job<TaskJobData> | undefined, err: Error) => {
    logger.warn(`[Worker] Job ${job?.id} failed on attempt ${job?.attemptsMade}: ${err.message}`);
    if (!job) return;
    // processTaskJob records its own failures. This catches the ones it never saw: BullMQ fails
    // a job that stalled too often without calling the processor, so the row would stay PROCESSING.
    void (async () => {
      if ((await job.getState()) !== 'failed') return; // a retry is coming
      await failAbandonedTask(job.data.taskId, describeFailure(err.message));
    })().catch((e) => logger.error(`[Worker] Could not record failure of ${job.id}: ${e.message}`));
  });
  // Emitted when this worker finds a job whose worker stopped renewing its lock (crashed,
  // killed, or blocked). BullMQ puts the job back in the queue, or fails it past the stall limit.
  worker.on('stalled', (jobId: string) => {
    logger.warn(`[Worker] Job ${jobId} stalled; its worker stopped responding`);
    taskRepository
      .createTaskLog(jobId, 'WARN', 'The worker running this task stopped responding; the job went back to the queue')
      .catch(() => undefined); // the task may have been deleted
  });
  worker.on('error', (err) => logger.error(`[Worker] ${err.message}`));

  const sweep = setInterval(() => {
    sweepLostTasks(SWEEP_QUIET_MS).catch((e) => logger.error(`[Recovery] Sweep failed: ${e.message}`));
  }, SWEEP_INTERVAL_MS);
  sweep.unref();
  worker.on('closing', () => clearInterval(sweep));

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
