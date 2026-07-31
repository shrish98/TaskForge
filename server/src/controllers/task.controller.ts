import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service.js';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../validations/task.validation.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export class TaskController {
  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const validatedData = createTaskSchema.parse(req.body);
      const task = await taskService.createTask({
        ...validatedData,
        userId: req.user.userId,
      });

      res.status(201).json(new ApiResponse(201, task, 'Task created and queued successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const queryParams = taskQuerySchema.parse(req.query);
      const result = await taskService.getTasks(
        {
          ...queryParams,
          userId: req.user.userId,
        },
        req.user.role
      );

      res.status(200).json(new ApiResponse(200, result, 'Tasks retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const { id } = req.params;
      const task = await taskService.getTaskById(id, req.user.userId, req.user.role);

      res.status(200).json(new ApiResponse(200, task, 'Task details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const { id } = req.params;
      const validatedData = updateTaskSchema.parse(req.body);
      const task = await taskService.updateTask(id, validatedData, req.user.userId, req.user.role);

      res.status(200).json(new ApiResponse(200, task, 'Task updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const { id } = req.params;
      await taskService.deleteTask(id, req.user.userId, req.user.role);

      res.status(200).json(new ApiResponse(200, null, 'Task deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  async retryTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const { id } = req.params;
      const retriedTask = await taskService.retryTask(id, req.user.userId, req.user.role);

      res.status(200).json(new ApiResponse(200, retriedTask, 'Task re-queued for execution'));
    } catch (error) {
      next(error);
    }
  }

  async getStatsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const stats = await taskService.getStatsSummary(req.user.userId, req.user.role);

      res.status(200).json(new ApiResponse(200, stats, 'Dashboard summary statistics retrieved'));
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
