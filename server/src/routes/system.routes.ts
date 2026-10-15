import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getLogs, getTimeline } from '../services/activity.service.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { getSystemMetrics } from '../services/metrics.service.js';
import { listDeadLetters } from '../queues/deadLetter.queue.js';
import { taskService } from '../services/task.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = Router();
router.use(authenticate);

router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await getSystemMetrics(req.user!.userId, req.user!.role);
    res.status(200).json(new ApiResponse(200, metrics, 'Live queue and Redis metrics'));
  } catch (error) {
    next(error);
  }
});

const timelineQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() });

router.get('/timeline', async (req, res, next) => {
  try {
    const { limit } = timelineQuery.parse(req.query);
    const attempts = await getTimeline(req.user!.userId, req.user!.role, limit);
    res.status(200).json(new ApiResponse(200, attempts, 'Recent attempts, oldest first'));
  } catch (error) {
    next(error);
  }
});

const logsQuery = z.object({
  level: z.enum(['INFO', 'WARN', 'ERROR']).optional(),
  search: z.string().max(200).optional(),
  before: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

router.get('/logs', async (req, res, next) => {
  try {
    const logs = await getLogs(req.user!.userId, req.user!.role, logsQuery.parse(req.query));
    res.status(200).json(new ApiResponse(200, logs, 'Task logs, newest first'));
  } catch (error) {
    next(error);
  }
});

// Dead-letter queue: tasks that ran out of attempts. Admin only, since it spans every user.
router.get('/dead-letter', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.status(200).json(new ApiResponse(200, await listDeadLetters(page, limit), 'Dead-letter queue'));
  } catch (error) {
    next(error);
  }
});

router.post('/dead-letter/:taskId/requeue', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const task = await taskService.retryTask(req.params.taskId, req.user!.userId, 'ADMIN');
    res.status(200).json(new ApiResponse(200, task, 'Task moved out of the dead-letter queue and re-queued'));
  } catch (error) {
    next(error);
  }
});

export default router;
