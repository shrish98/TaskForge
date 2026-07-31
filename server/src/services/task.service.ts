import { taskRepository, CreateTaskData, TaskQueryOptions } from '../repositories/task.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { TaskStatus } from '@prisma/client';
import { addJobToQueue } from '../queues/task.queue.js';
import { logger } from '../utils/logger.js';

export class TaskService {
  async createTask(data: CreateTaskData) {
    const task = await taskRepository.create(data);

    await taskRepository.createTaskLog(
      task.id,
      'INFO',
      data.scheduledAt
        ? `Task created and scheduled for execution at ${data.scheduledAt.toISOString()}`
        : 'Task created and queued for asynchronous execution'
    );

    // Calculate delay if scheduled in future
    const delayMs = data.scheduledAt ? Math.max(0, data.scheduledAt.getTime() - Date.now()) : 0;

    // Push job to BullMQ Redis Queue
    try {
      await addJobToQueue(task.id, task.userId, task.type, task.payload || {}, task.priority, delayMs);
    } catch (err: any) {
      logger.error(`Failed to push task ${task.id} to BullMQ queue: ${err.message}`);
    }

    return task;
  }

  async getTasks(options: TaskQueryOptions, userRole: 'USER' | 'ADMIN') {
    return taskRepository.findMany(options);
  }

  async getTaskById(taskId: string, userId: string, userRole: 'USER' | 'ADMIN') {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (userRole !== 'ADMIN' && task.userId !== userId) {
      throw new ApiError(403, 'Access Denied: You do not have permission to view this task');
    }

    return task;
  }

  async updateTask(taskId: string, updateData: Partial<CreateTaskData>, userId: string, userRole: 'USER' | 'ADMIN') {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (userRole !== 'ADMIN' && task.userId !== userId) {
      throw new ApiError(403, 'Access Denied: You do not have permission to modify this task');
    }

    if (task.status === TaskStatus.PROCESSING) {
      throw new ApiError(400, 'Cannot modify a task that is currently PROCESSING');
    }

    const updatedTask = await taskRepository.update(taskId, updateData);
    await taskRepository.createTaskLog(taskId, 'INFO', 'Task parameters updated');

    return updatedTask;
  }

  async deleteTask(taskId: string, userId: string, userRole: 'USER' | 'ADMIN') {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (userRole !== 'ADMIN' && task.userId !== userId) {
      throw new ApiError(403, 'Access Denied: You do not have permission to delete this task');
    }

    return taskRepository.delete(taskId);
  }

  async retryTask(taskId: string, userId: string, userRole: 'USER' | 'ADMIN') {
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (userRole !== 'ADMIN' && task.userId !== userId) {
      throw new ApiError(403, 'Access Denied: You do not have permission to retry this task');
    }

    if (task.status !== TaskStatus.FAILED) {
      throw new ApiError(400, `Only FAILED tasks can be retried. Current status is ${task.status}`);
    }

    // Reset task status to PENDING and clear error
    const retriedTask = await taskRepository.updateStatus(taskId, TaskStatus.PENDING, 0, null, undefined);

    await taskRepository.createTaskLog(taskId, 'INFO', 'Task manually re-queued for retry by user');

    // Re-add to BullMQ Redis Queue
    try {
      await addJobToQueue(
        retriedTask.id,
        retriedTask.userId,
        retriedTask.type,
        retriedTask.payload || {},
        retriedTask.priority,
        0
      );
    } catch (err: any) {
      logger.error(`Failed to re-queue retried task ${taskId}: ${err.message}`);
    }

    return retriedTask;
  }

  async getStatsSummary(userId: string, userRole: 'USER' | 'ADMIN') {
    return taskRepository.getSummaryStats(userId);
  }
}

export const taskService = new TaskService();
