import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const TASK_QUEUE_NAME = 'taskforge-task-queue';

// The job carries only ids. The worker loads the task from Postgres when it runs, so edits made
// while a task waits in the queue are picked up, and a task deleted meanwhile is skipped.
export interface TaskJobData {
  taskId: string;
  userId: string;
  type: string;
}

export const MAX_ATTEMPTS = 3;
export const BACKOFF_MS = Number(process.env.JOB_BACKOFF_MS) || 2000;

export const taskQueue = new Queue<TaskJobData>(TASK_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: MAX_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: BACKOFF_MS, // 2s, then 4s between the three attempts
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

/**
 * Queues a task, using the task id as the BullMQ job id so a task can only be in the queue once.
 * BullMQ silently ignores add() when a job with that id still exists, which is what used to make
 * "retry" do nothing: the old failed job was still kept. A finished job is removed first.
 */
export const addJobToQueue = async (taskId: string, userId: string, type: string, priority = 1, delayMs = 0) => {
  const existing = await taskQueue.getJob(taskId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'completed' || state === 'failed') {
      await existing.remove();
    } else {
      logger.info(`[Queue] Task ${taskId} is already ${state}; not adding it twice`);
      return existing;
    }
  }

  const job = await taskQueue.add(
    type,
    { taskId, userId, type },
    {
      jobId: taskId,
      priority: 4 - priority, // BullMQ: a lower number runs first, and P3 is our most urgent
      ...(delayMs > 0 ? { delay: delayMs } : {}),
    }
  );
  logger.info(`[Queue] Added job ${job.id} (${type}, delay ${delayMs} ms)`);
  return job;
};

/** Drops a task's job if it hasn't started yet. A running job is left to finish or fail. */
export const removeQueuedJob = async (taskId: string) => {
  const job = await taskQueue.getJob(taskId);
  if (!job) return;
  const state = await job.getState();
  if (state !== 'active') await job.remove();
};
