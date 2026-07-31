import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { initSocketServer } from './socket/socket.server.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO Real-time Engine
const io = initSocketServer(server);

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Global Rate Limiting
app.use('/api', apiRateLimiter);

// System Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Saarthi AI - Express API Gateway & Socket.IO Engine',
    websockets: io ? 'Active' : 'Inactive',
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);

// Centralized Error Middleware
app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`🚀 [Server] Express API Gateway & Socket.IO Engine running on port ${PORT}`);
});

export { app, server, io };
