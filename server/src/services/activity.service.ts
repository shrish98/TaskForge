import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../config/db.js';

type Role = 'USER' | 'ADMIN';

const scopeTasks = (userId: string, role: Role): Prisma.TaskWhereInput => (role === 'ADMIN' ? {} : { userId });

/**
 * The most recent attempts at running tasks, for the worker timeline. Each retry is its own
 * attempt, so a job that failed twice and then succeeded shows as three runs.
 */
export async function getTimeline(userId: string, role: Role, limit = 60) {
  const attempts = await prisma.taskAttempt.findMany({
    where: { task: scopeTasks(userId, role) },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      number: true,
      worker: true,
      outcome: true,
      error: true,
      startedAt: true,
      endedAt: true,
      task: { select: { id: true, title: true, type: true, status: true, progress: true, maxAttempts: true, updatedAt: true } },
    },
  });

  return attempts.reverse().map(({ task, ...a }) => {
    // A worker that crashed mid-job leaves its attempt RUNNING forever. If the task has moved on
    // since, close the run where the task last changed rather than drawing it up to now.
    const abandoned = a.outcome === 'RUNNING' && task.status !== TaskStatus.PROCESSING;
    return {
      ...a,
      outcome: abandoned ? 'ABANDONED' : a.outcome,
      endedAt: abandoned ? task.updatedAt : a.endedAt,
      task: { id: task.id, title: task.title, type: task.type, progress: task.progress, maxAttempts: task.maxAttempts },
    };
  });
}

export interface LogQuery {
  level?: 'INFO' | 'WARN' | 'ERROR';
  search?: string;
  before?: Date;
  limit?: number;
}

/** Log lines across the caller's tasks, newest first, with the task each line belongs to. */
export async function getLogs(userId: string, role: Role, query: LogQuery) {
  const limit = Math.min(200, Math.max(1, query.limit ?? 50));
  const where: Prisma.TaskLogWhereInput = {
    task: scopeTasks(userId, role),
    ...(query.level ? { level: query.level } : {}),
    ...(query.before ? { createdAt: { lt: query.before } } : {}),
    ...(query.search
      ? {
          OR: [
            { message: { contains: query.search, mode: 'insensitive' } },
            { task: { title: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.taskLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: { id: true, level: true, message: true, createdAt: true, task: { select: { id: true, title: true, type: true } } },
  });

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  return { data, nextBefore: hasMore ? data[data.length - 1].createdAt.toISOString() : null };
}
