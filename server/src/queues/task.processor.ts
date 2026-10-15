import os from 'os';
import { Job, UnrecoverableError } from 'bullmq';
import { TaskStatus } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../config/db.js';
import { jobHandlers } from '../jobs/index.js';
import { UnsafeUrlError } from '../lib/safeFetch.js';
import { taskRepository } from '../repositories/task.repository.js';
import { publishTaskEvent } from '../events/taskEvents.js';
import { parseTaskPayload } from '../validations/task.validation.js';
import { logger } from '../utils/logger.js';
import { sendToDeadLetter } from './deadLetter.queue.js';
import { MAX_ATTEMPTS, TaskJobData } from './task.queue.js';

// Which process ran an attempt, shown on the worker timeline.
const WORKER_ID = `${os.hostname()}:${process.pid}`;

// Errors that will be the same on every attempt. Wrapping them in UnrecoverableError makes
// BullMQ fail the job straight away instead of burning two more attempts and the backoff.
const toUnrecoverable = (err: unknown) =>
  err instanceof UnsafeUrlError || err instanceof ZodError
    ? new UnrecoverableError(err instanceof ZodError ? `Invalid payload: ${err.issues[0]?.message}` : err.message)
    : err;

/**
 * Runs one attempt of a task. Every database write happens here, in order, before the job
 * settles, so the task row never disagrees with BullMQ about where the job is. (Writing from
 * the worker's event listeners raced: a late "progress" write could land after "completed".)
 */
export async function processTaskJob(job: Job<TaskJobData>) {
  const { taskId } = job.data;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    logger.info(`[Worker] Task ${taskId} was deleted before it ran; skipping`);
    return { skipped: true };
  }

  const attempt = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? MAX_ATTEMPTS;
  const event = (status: TaskStatus, progress: number, extra: { message?: string; error?: string | null } = {}) =>
    publishTaskEvent({ userId: task.userId, taskId, status, progress, ...extra });

  await taskRepository.markStarted(taskId, attempt);
  const run = await taskRepository.startAttempt(taskId, attempt, WORKER_ID);
  await taskRepository.createTaskLog(taskId, 'INFO', `Attempt ${attempt}/${maxAttempts} started on worker`);
  await event(TaskStatus.PROCESSING, 5);

  try {
    const payload = parseTaskPayload(task.type, task.payload);
    const outcome = await jobHandlers[task.type]({
      taskId,
      userId: task.userId,
      payload,
      progress: async (percent, message) => {
        await job.updateProgress(percent);
        await taskRepository.updateProgress(taskId, percent);
        if (message) await taskRepository.createTaskLog(taskId, 'INFO', message);
        await event(TaskStatus.PROCESSING, percent, { message });
      },
    });

    if (outcome.artifact) await taskRepository.saveArtifact(taskId, outcome.artifact);
    await taskRepository.finishAttempt(run.id, 'COMPLETED');
    await taskRepository.markCompleted(taskId, outcome.output);
    await taskRepository.createTaskLog(taskId, 'INFO', outcome.message);
    await event(TaskStatus.COMPLETED, 100, { message: outcome.message });
    return outcome.output;
  } catch (raw) {
    const err = toUnrecoverable(raw) as Error;
    const final = err instanceof UnrecoverableError || attempt >= maxAttempts;
    await taskRepository.finishAttempt(run.id, 'FAILED', err.message);

    if (final) {
      // Park it first: once the row says FAILED, the dead-letter entry must already exist.
      await sendToDeadLetter({ taskId, userId: task.userId, type: task.type, error: err.message, attempts: attempt });
      await taskRepository.markFailed(taskId, err.message);
      await taskRepository.createTaskLog(
        taskId,
        'ERROR',
        err instanceof UnrecoverableError && attempt < maxAttempts
          ? `Failed with an error retrying can't fix: ${err.message}. Moved to the dead-letter queue.`
          : `Failed after ${attempt} attempts: ${err.message}. Moved to the dead-letter queue.`
      );
      await event(TaskStatus.FAILED, task.progress, { error: err.message });
    } else {
      const waitMs = (job.opts.backoff as { delay?: number } | undefined)?.delay ?? 0;
      await taskRepository.createTaskLog(
        taskId,
        'WARN',
        `Attempt ${attempt} failed: ${err.message}. Retrying in ${(waitMs * 2 ** (attempt - 1)) / 1000}s.`
      );
      await event(TaskStatus.PROCESSING, task.progress, { message: `Attempt ${attempt} failed, retrying` });
    }
    throw err;
  }
}
