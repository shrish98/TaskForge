import { taskRepository, CreateTaskData, TaskQueryOptions } from '../repositories/task.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { TaskStatus } from '@prisma/client';

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

    return retriedTask;
  }

  async getStatsSummary(userId: string, userRole: 'USER' | 'ADMIN') {
    return taskRepository.getSummaryStats(userId);
  }
}

export const taskService = new TaskService();
