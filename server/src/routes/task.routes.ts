import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all task endpoints with JWT authentication guard
router.use(authenticate);

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/stats/summary', taskController.getStatsSummary);
router.get('/:id', taskController.getTaskById);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.post('/:id/retry', taskController.retryTask);

export default router;
