import { TaskStatus } from '@prisma/client';
import { ZodError } from 'zod';
import { taskRepository, CreateTaskData, TaskQueryOptions } from '../repositories/task.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { addJobToQueue, removeQueuedJob, taskQueue } from '../queues/task.queue.js';
import { removeFromDeadLetter } from '../queues/deadLetter.queue.js';
import { publishTaskEvent } from '../events/taskEvents.js';
import { parseTaskPayload } from '../validations/task.validation.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const IDEMPOTENCY_TTL_SECONDS = 24 * 3600;
const PENDING = 'pending';

type Role = 'USER' | 'ADMIN';

export class TaskService {
  /**
   * Creates a task and queues it. With an Idempotency-Key, a client that retries the same request
   * (after a timeout, a double click, a flaky network) gets the task it already created back
   * instead of a duplicate job. Keys are scoped per user and kept for 24 hours.
   */
  async createTask(data: CreateTaskData, idempotencyKey?: string): Promise<{ task: any; replayed: boolean }> {
    const redisKey = idempotencyKey ? `idempotency:${data.userId}:${idempotencyKey}` : null;

    if (redisKey) {
      // SET NX is atomic, so of two identical requests racing, exactly one claims the key.
      const claimed = await redis.set(redisKey, PENDING, 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX');
      if (!claimed) {
        const existingId = await redis.get(redisKey);
        if (existingId && existingId !== PENDING) {
          const task = await taskRepository.findById(existingId);
          if (task) return { task, replayed: true };
        }
        throw new ApiError(409, 'A request with this Idempotency-Key is already being processed');
      }
    }

    try {
      const task = await this.createAndQueue(data);
      if (redisKey) await redis.set(redisKey, task.id, 'EX', IDEMPOTENCY_TTL_SECONDS);
      return { task, replayed: false };
    } catch (err) {
      // Let the client retry with the same key if we never created the task.
      if (redisKey) await redis.del(redisKey);
      throw err;
    }
  }

  private async createAndQueue(data: CreateTaskData) {
    const task = await taskRepository.create(data);
    const delayMs = data.scheduledAt ? Math.max(0, data.scheduledAt.getTime() - Date.now()) : 0;

    try {
      await addJobToQueue(task.id, task.userId, task.type, task.priority, delayMs);
    } catch (err: any) {
      // Without this the task would sit in PENDING forever with nothing in Redis to run it.
      logger.error(`Could not queue task ${task.id}: ${err.message}`);
      await taskRepository.delete(task.id);
      throw new ApiError(503, 'The job queue is unavailable right now. Please try again.');
    }

    await taskRepository.createTaskLog(
      task.id,
      'INFO',
      delayMs > 0 ? `Scheduled to run at ${data.scheduledAt!.toISOString()}` : 'Queued for a worker'
    );
    await publishTaskEvent({ userId: task.userId, taskId: task.id, status: TaskStatus.PENDING, progress: 0 });
    return task;
  }

  async getTasks(options: TaskQueryOptions, userRole: Role) {
    return taskRepository.findMany({ ...options, userRole });
  }

  async getTaskById(taskId: string, userId: string, userRole: Role) {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (userRole !== 'ADMIN' && task.userId !== userId) {
      throw new ApiError(403, 'Access Denied: You do not have permission to view this task');
    }

    return task;
  }

  async updateTask(taskId: string, updateData: Partial<CreateTaskData>, userId: string, userRole: Role) {
    const task = await this.getTaskById(taskId, userId, userRole);

    if (task.status === TaskStatus.PROCESSING) {
      throw new ApiError(400, 'Cannot modify a task that is currently PROCESSING');
    }

    // The type and payload have to agree, whichever of the two changed.
    if (updateData.type || updateData.payload) {
      try {
        parseTaskPayload(updateData.type ?? task.type, updateData.payload ?? task.payload);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ApiError(400, 'Validation Error', err.issues.map((i) => ({ field: ['payload', ...i.path].join('.'), message: i.message })));
        }
        throw err;
      }
    }

    const updatedTask = await taskRepository.update(taskId, updateData);
    await taskRepository.createTaskLog(taskId, 'INFO', 'Task parameters updated');

    // The worker reads the task when it runs, so edits apply. Priority lives on the job itself.
    if (updateData.priority && task.status === TaskStatus.PENDING) {
      const job = await taskQueue.getJob(taskId);
      if (job && (await job.getState()) === 'prioritized') {
        await job.changePriority({ priority: 4 - updateData.priority });
      }
    }

    return updatedTask;
  }

  async deleteTask(taskId: string, userId: string, userRole: Role) {
    await this.getTaskById(taskId, userId, userRole);
    await Promise.all([removeQueuedJob(taskId), removeFromDeadLetter(taskId)]);
    return taskRepository.delete(taskId);
  }

  async retryTask(taskId: string, userId: string, userRole: Role) {
    const task = await this.getTaskById(taskId, userId, userRole);

    if (task.status !== TaskStatus.FAILED) {
      throw new ApiError(400, `Only FAILED tasks can be retried. Current status is ${task.status}`);
    }

    const retriedTask = await taskRepository.resetForRetry(taskId);
    await removeFromDeadLetter(taskId);
    try {
      await addJobToQueue(retriedTask.id, retriedTask.userId, retriedTask.type, retriedTask.priority, 0);
    } catch (err: any) {
      await taskRepository.markFailed(taskId, `Could not re-queue: ${err.message}`);
      throw new ApiError(503, 'The job queue is unavailable right now. Please try again.');
    }

    await taskRepository.createTaskLog(taskId, 'INFO', 'Re-queued by hand with a fresh set of attempts');
    await publishTaskEvent({ userId: task.userId, taskId, status: TaskStatus.PENDING, progress: 0 });
    return retriedTask;
  }

  async getArtifact(taskId: string, userId: string, userRole: Role) {
    await this.getTaskById(taskId, userId, userRole);
    const artifact = await taskRepository.findArtifact(taskId);
    if (!artifact) throw new ApiError(404, 'This task has not produced a file');
    return artifact;
  }

  async getStatsSummary(userId: string, userRole: Role) {
    return taskRepository.getSummaryStats(userId, userRole);
  }
}

export const taskService = new TaskService();
