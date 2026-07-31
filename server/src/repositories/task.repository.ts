import { prisma } from '../config/db.js';
import { Task, TaskStatus, TaskType, Prisma } from '@prisma/client';

export interface CreateTaskData {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: number;
  payload?: any;
  scheduledAt?: Date;
  userId: string;
}

export interface TaskQueryOptions {
  userId: string;
  search?: string;
  status?: TaskStatus;
  type?: TaskType;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'priority' | 'status' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class TaskRepository {
  async create(data: CreateTaskData): Promise<Task> {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type || TaskType.FILE_PROCESSING,
        priority: data.priority || 1,
        payload: data.payload ? (data.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
        scheduledAt: data.scheduledAt,
        userId: data.userId,
        status: TaskStatus.PENDING,
      },
    });
  }

  async findById(id: string): Promise<(Task & { taskLogs: any[] }) | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        taskLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findMany(options: TaskQueryOptions): Promise<PaginatedResult<Task>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      userId: options.userId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.type ? { type: options.type } : {}),
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search, mode: 'insensitive' } },
              { description: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    const [total, data] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    progress: number = 0,
    result?: any,
    error?: string
  ): Promise<Task> {
    const updateData: Prisma.TaskUpdateInput = {
      status,
      progress,
      ...(result !== undefined ? { result: result as Prisma.InputJsonValue } : {}),
      ...(error !== undefined ? { error } : {}),
      ...(status === TaskStatus.COMPLETED ? { completedAt: new Date() } : {}),
      ...(status === TaskStatus.FAILED ? { failedAt: new Date() } : {}),
    };

    return prisma.task.update({
      where: { id },
      data: updateData,
    });
  }

  async incrementAttempts(id: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  }

  async update(id: string, data: Partial<CreateTaskData>): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.payload ? { payload: data.payload as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async delete(id: string): Promise<Task> {
    return prisma.task.delete({
      where: { id },
    });
  }

  async getSummaryStats(userId: string) {
    const [total, pending, processing, completed, failed] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: TaskStatus.PENDING } }),
      prisma.task.count({ where: { userId, status: TaskStatus.PROCESSING } }),
      prisma.task.count({ where: { userId, status: TaskStatus.COMPLETED } }),
      prisma.task.count({ where: { userId, status: TaskStatus.FAILED } }),
    ]);

    return {
      total,
      pending,
      processing,
      completed,
      failed,
    };
  }

  async createTaskLog(taskId: string, level: 'INFO' | 'WARN' | 'ERROR', message: string) {
    return prisma.taskLog.create({
      data: {
        taskId,
        level,
        message,
      },
    });
  }
}

export const taskRepository = new TaskRepository();
