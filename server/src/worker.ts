import { Worker, Job } from 'bullmq';
import { TASK_QUEUE_NAME, TaskJobData } from './queues/task.queue.js';
import { TaskProcessor } from './queues/task.processor.js';
import { redisConfig } from './config/redis.js';
import { taskRepository } from './repositories/task.repository.js';
import { TaskStatus } from '@prisma/client';
import { logger } from './utils/logger.js';

console.log('⚡ [Worker Process] Initializing TaskForge BullMQ Task Worker...');

export const worker = new Worker<TaskJobData>(
  TASK_QUEUE_NAME,
  async (job: Job<TaskJobData>) => {
    logger.info(`🔄 [Worker] Processing Job #${job.id} (Task: ${job.data.taskId}, Type: ${job.data.type})`);
    return TaskProcessor.processJob(job);
  },
  {
    connection: redisConfig,
    concurrency: 5,
  }
);

// Worker Event Listeners
worker.on('active', async (job: Job<TaskJobData>) => {
  const { taskId, userId } = job.data;
  logger.info(`▶️ [Worker] Job #${job.id} is now ACTIVE (Task ID: ${taskId})`);

  try {
    await taskRepository.incrementAttempts(taskId);
    await taskRepository.updateStatus(taskId, TaskStatus.PROCESSING, 10);
    await taskRepository.createTaskLog(taskId, 'INFO', `Worker picked up job #${job.id} for processing.`);
  } catch (err: any) {
    logger.error(`Failed to update active state for task ${taskId}: ${err.message}`);
  }
});

worker.on('progress', async (job: Job<TaskJobData>, progress: any) => {
  const { taskId, userId } = job.data;
  const progressPercent = typeof progress === 'number' ? progress : parseInt(String(progress), 10) || 50;

  try {
    await taskRepository.updateStatus(taskId, TaskStatus.PROCESSING, progressPercent);
    await taskRepository.createTaskLog(taskId, 'INFO', `Job progress updated: ${progressPercent}%`);
  } catch (err: any) {
    logger.error(`Failed to update progress for task ${taskId}: ${err.message}`);
  }
});

worker.on('completed', async (job: Job<TaskJobData>, result: any) => {
  const { taskId, userId } = job.data;
  logger.info(`✅ [Worker] Job #${job.id} COMPLETED successfully (Task ID: ${taskId})`);

  try {
    const outputResult = result?.output || result;
    await taskRepository.updateStatus(
      taskId,
      TaskStatus.COMPLETED,
      100,
      outputResult,
      undefined
    );
    await taskRepository.createTaskLog(
      taskId,
      'INFO',
      result?.message || 'Job completed successfully with 100% progress.'
    );
  } catch (err: any) {
    logger.error(`Failed to update completion state for task ${taskId}: ${err.message}`);
  }
});

worker.on('failed', async (job: Job<TaskJobData> | undefined, err: Error) => {
  if (!job) return;

  const { taskId, userId } = job.data;
  const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 3);
  logger.error(
    `❌ [Worker] Job #${job.id} FAILED (Task ID: ${taskId}, Attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`
  );

  try {
    if (isFinalAttempt) {
      await taskRepository.updateStatus(
        taskId,
        TaskStatus.FAILED,
        (job.progress as number) || 0,
        undefined,
        err.message
      );
      await taskRepository.createTaskLog(
        taskId,
        'ERROR',
        `Job failed permanently after ${job.attemptsMade} attempts: ${err.message}`
      );
    } else {
      await taskRepository.createTaskLog(
        taskId,
        'WARN',
        `Job attempt ${job.attemptsMade} failed: ${err.message}. Retrying with exponential backoff...`
      );
    }
  } catch (dbErr: any) {
    logger.error(`Failed to update failure state for task ${taskId}: ${dbErr.message}`);
  }
});

const handleShutdown = async () => {
  logger.info('🛑 [Worker] Closing BullMQ worker connections...');
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
