import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

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
    service: 'Saarthi AI - Express API Gateway Engine',
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);

// Centralized Error Middleware
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 [Server] Express API Gateway running on port ${PORT}`);
});

export { app, server };
