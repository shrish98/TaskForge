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
  userRole?: 'USER' | 'ADMIN';
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

  async findById(id: string): Promise<(Task & { taskLogs: any[]; user?: { email: string; name: string } }) | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true, name: true },
        },
        taskLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findMany(options: TaskQueryOptions): Promise<PaginatedResult<any>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      ...(options.userRole === 'ADMIN' ? {} : { userId: options.userId }),
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
        include: {
          user: {
            select: { email: true, name: true, role: true },
          },
        },
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

  /** Marks the start of an attempt. `attempt` comes from BullMQ, so re-running it is harmless. */
  async markStarted(id: string, attempt: number): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: { status: TaskStatus.PROCESSING, progress: 5, attempts: attempt, startedAt: new Date(), error: null },
    });
  }

  /** Only moves progress forward on a running task, so a late write can't undo a finished one. */
  async updateProgress(id: string, progress: number) {
    return prisma.task.updateMany({
      where: { id, status: TaskStatus.PROCESSING, progress: { lt: progress } },
      data: { progress },
    });
  }

  async markCompleted(id: string, result: Record<string, unknown>): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        progress: 100,
        result: result as Prisma.InputJsonValue,
        error: null,
        completedAt: new Date(),
        failedAt: null,
      },
    });
  }

  async markFailed(id: string, error: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: { status: TaskStatus.FAILED, error, failedAt: new Date() },
    });
  }

  async resetForRetry(id: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.PENDING,
        progress: 0,
        attempts: 0,
        error: null,
        result: Prisma.JsonNull,
        startedAt: null,
        completedAt: null,
        failedAt: null,
      },
    });
  }

  /** One file per task; a retry that produces a new file replaces the old one. */
  async saveArtifact(taskId: string, artifact: { fileName: string; mimeType: string; data: Buffer }) {
    const data = { fileName: artifact.fileName, mimeType: artifact.mimeType, size: artifact.data.length, data: artifact.data };
    return prisma.taskArtifact.upsert({
      where: { taskId },
      create: { taskId, ...data },
      update: { ...data, createdAt: new Date() },
      select: { id: true },
    });
  }

  async findArtifact(taskId: string) {
    return prisma.taskArtifact.findUnique({ where: { taskId } });
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

  async getSummaryStats(userId: string, userRole?: 'USER' | 'ADMIN') {
    const whereClause: Prisma.TaskWhereInput = userRole === 'ADMIN' ? {} : { userId };

    const [total, pending, processing, completed, failed] = await Promise.all([
      prisma.task.count({ where: whereClause }),
      prisma.task.count({ where: { ...whereClause, status: TaskStatus.PENDING } }),
      prisma.task.count({ where: { ...whereClause, status: TaskStatus.PROCESSING } }),
      prisma.task.count({ where: { ...whereClause, status: TaskStatus.COMPLETED } }),
      prisma.task.count({ where: { ...whereClause, status: TaskStatus.FAILED } }),
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
