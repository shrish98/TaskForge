import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Saarthi AI - API Gateway'
  });
});

app.get('/api/v1', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Saarthi AI Task Automation & Job Processing API Gateway',
    version: '1.0.0'
  });
});

server.listen(PORT, () => {
  console.log(`🚀 [Server] Express API Gateway running on port ${PORT}`);
});

export { app, server };
