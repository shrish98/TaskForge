import { z } from 'zod';
import { TaskStatus, TaskType } from '@prisma/client';

const httpUrl = z
  .string()
  .url('Must be a full URL, e.g. https://example.com')
  .max(2048)
  .refine((u) => /^https?:\/\//i.test(u), 'Only http and https URLs are allowed');

// What each job type needs in its payload. Checked when a task is created or edited, so a bad
// payload is a 400 for the user instead of a job that fails three times in the worker.
export const payloadSchemas: Record<TaskType, z.ZodTypeAny> = {
  FILE_PROCESSING: z.object({ imageUrl: httpUrl }),
  WEB_SCRAPE: z.object({ url: httpUrl, selector: z.string().min(1).max(200).optional() }),
  REPORT_GENERATION: z.object({}),
  DATA_EXPORT: z.object({ status: z.nativeEnum(TaskStatus).optional() }),
  NOTIFICATION_DISPATCH: z.object({
    webhookUrl: httpUrl,
    data: z.record(z.string(), z.any()).optional(),
  }),
};

export function parseTaskPayload(type: TaskType, payload: unknown) {
  return payloadSchemas[type].parse(payload ?? {}) as Record<string, any>;
}

export const createTaskSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters long').max(150),
    description: z.string().max(1000).optional(),
    type: z.nativeEnum(TaskType).optional().default(TaskType.FILE_PROCESSING),
    priority: z.number().int().min(1).max(3).optional().default(1),
    payload: z.record(z.string(), z.any()).optional(),
    scheduledAt: z
      .string()
      .datetime()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
  })
  .superRefine((task, ctx) => {
    const result = payloadSchemas[task.type].safeParse(task.payload ?? {});
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['payload', ...issue.path] } as z.IssueData);
      }
    }
  });

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(TaskType).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  payload: z.record(z.string(), z.any()).optional(),
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

export const idempotencyKeySchema = z
  .string()
  .min(8, 'Idempotency-Key must be at least 8 characters')
  .max(128, 'Idempotency-Key must be at most 128 characters')
  .regex(/^[\w.:-]+$/, 'Idempotency-Key may only contain letters, digits and _ . : -');
