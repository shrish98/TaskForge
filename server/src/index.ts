import dotenv from 'dotenv';
import http from 'http';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { app } from './app.js';
import { initSocketServer } from './socket/socket.server.js';
import { createTaskWorker } from './worker.js';
import { registerShutdown } from './lifecycle.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initSocketServer(server);

// Free hosting tiers give you one process, so by default the worker runs inside the API.
// docker-compose sets RUN_WORKER_IN_API=false and runs the worker as its own container.
const worker = process.env.RUN_WORKER_IN_API === 'false' ? undefined : createTaskWorker();

registerShutdown({ server, io, worker });

server.listen(PORT, () => {
  logger.info(`🚀 [Server] API and Socket.IO on port ${PORT}${worker ? ', worker running in-process' : ''}`);
});
