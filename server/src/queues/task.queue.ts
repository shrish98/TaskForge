import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const TASK_QUEUE_NAME = 'saarthi-task-queue';

export interface TaskJobData {
  taskId: string;
  userId: string;
  type: string;
  payload: any;
}

export const taskQueue = new Queue<TaskJobData>(TASK_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s backoff
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

export const addJobToQueue = async (
  taskId: string,
  userId: string,
  type: string,
  payload: any,
  priority = 1,
  delayMs = 0
) => {
  try {
    const job = await taskQueue.add(
      type,
      { taskId, userId, type, payload },
      {
        jobId: taskId, // Use task ID as unique job ID
        priority: 4 - priority, // BullMQ priority: lower number = higher priority
        ...(delayMs > 0 ? { delay: delayMs } : {}),
      }
    );

    logger.info(`📥 [BullMQ Queue] Added Job #${job.id} (Task: ${taskId}, Delay: ${delayMs}ms)`);
    return job;
  } catch (error: any) {
    logger.error(`❌ [BullMQ Queue] Failed to add job to queue: ${error.message}`);
    throw error;
  }
};
