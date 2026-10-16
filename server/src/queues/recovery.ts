import { TaskStatus } from '@prisma/client';
import { prisma } from '../config/db.js';
import { taskRepository } from '../repositories/task.repository.js';
import { publishTaskEvent } from '../events/taskEvents.js';
import { logger } from '../utils/logger.js';
import { removeFromDeadLetter, sendToDeadLetter } from './deadLetter.queue.js';
import { taskQueue } from './task.queue.js';

// BullMQ's reason for a job whose worker died (lock expired) more often than maxStalledCount.
export const STALL_LIMIT_REASON = 'job stalled more than allowable limit';

/**
 * Fails a task whose job ended without processTaskJob's catch block running, so nothing wrote
 * the failure to Postgres. That happens when the worker running it keeps dying (BullMQ fails the
 * job after too many stalls without calling the processor), or when the job vanished from Redis.
 * Safe to call more than once and from several processes: only the first call reports it.
 */
export async function failAbandonedTask(taskId: string, reason: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true, type: true, status: true, attempts: true, progress: true },
  });
  if (!task || (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.PROCESSING)) return false;

  await taskRepository.closeOrphanedAttempts(taskId, reason);
  // Park it first: once the row says FAILED, the dead-letter entry must already exist.
  await sendToDeadLetter({ taskId, userId: task.userId, type: task.type, error: reason, attempts: task.attempts });
  if (!(await taskRepository.markFailedIfUnfinished(taskId, reason))) {
    // It finished in the meantime. Keep the entry only if it failed.
    const now = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true } });
    if (now?.status !== TaskStatus.FAILED) await removeFromDeadLetter(taskId);
    return false;
  }

  await taskRepository.createTaskLog(taskId, 'ERROR', `${reason}. Moved to the dead-letter queue.`);
  await publishTaskEvent({ userId: task.userId, taskId, status: TaskStatus.FAILED, progress: task.progress, error: reason });
  logger.warn(`[Recovery] Task ${taskId} failed outside the processor: ${reason}`);
  return true;
}

/** Turns BullMQ's internal failure reasons into something a user can act on. */
export function describeFailure(message: string) {
  return message === STALL_LIMIT_REASON
    ? 'The worker running this task stopped responding more than once (it may be crashing on this task)'
    : message;
}

/**
 * Safety net for tasks stuck in PENDING or PROCESSING with no live job behind them, e.g. Redis
 * lost the job, or a failure event was missed because the database was down at the time. Only
 * tasks nothing has written to for `quietMs` are checked, and a task whose job is still waiting,
 * delayed or running is left alone, however long it takes.
 */
export async function sweepLostTasks(quietMs: number) {
  const quiet = await taskRepository.findQuietUnfinished(new Date(Date.now() - quietMs));
  let failed = 0;
  for (const task of quiet) {
    const job = await taskQueue.getJob(task.id);
    const state = job ? await job.getState() : 'missing';
    if (state === 'missing' || state === 'unknown') {
      if (await failAbandonedTask(task.id, 'The job was lost from the queue')) failed++;
    } else if (state === 'failed') {
      const reason = describeFailure(job?.failedReason || 'The job failed without recording why');
      if (await failAbandonedTask(task.id, reason)) failed++;
    }
  }
  if (failed > 0) logger.warn(`[Recovery] Sweep failed ${failed} task(s) that had no live job`);
  return failed;
}
