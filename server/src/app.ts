import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import systemRoutes from './routes/system.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';

// The Express app on its own, without listening or starting the worker, so tests can drive it
// with supertest. index.ts wires it to an HTTP server, Socket.IO and the worker.
export const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(cors());
app.use(helmet());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Global Rate Limiting
app.use('/api', apiRateLimiter);

// System Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'TaskForge API',
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/system', systemRoutes);

// Centralized Error Middleware
app.use(errorHandler);
