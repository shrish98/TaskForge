import { z } from 'zod';
import { TaskStatus, TaskType } from '@prisma/client';

export const createTaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long').max(150),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(TaskType).optional().default(TaskType.FILE_PROCESSING),
  priority: z.number().int().min(1).max(3).optional().default(1),
  payload: z.record(z.any()).optional(),
  scheduledAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(TaskType).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  payload: z.record(z.any()).optional(),
});

export const taskQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  type: z.nativeEnum(TaskType).optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  sortBy: z.enum(['createdAt', 'priority', 'status', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
