import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
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
