import http from 'http';
import { Worker } from 'bullmq';
import { Server as SocketServer } from 'socket.io';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';
import { closeTaskEvents } from './events/taskEvents.js';
import { shutdownOcr } from './jobs/ocr.js';
import { deadLetterQueue } from './queues/deadLetter.queue.js';
import { taskQueue } from './queues/task.queue.js';
import { logger } from './utils/logger.js';

// Hosting platforms send SIGTERM on every deploy and give the process a short grace period
// (Docker: 10 s by default, raised to 30 s in docker-compose.yml) before killing it.
const FORCE_EXIT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 25_000;

interface Resources {
  server?: http.Server;
  io?: SocketServer;
  worker?: Worker;
}

/**
 * Graceful shutdown, in dependency order: stop taking new HTTP requests, let the worker finish
 * the jobs it is running (worker.close() waits for them and stops picking up new ones), then
 * close queues and connections. A job still running at the hard deadline is not lost: BullMQ
 * sees its lock expire and hands it to another worker as a stalled job.
 */
export function registerShutdown({ server, io, worker }: Resources) {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[Shutdown] ${signal} received, draining`);
    setTimeout(() => {
      logger.error(`[Shutdown] Still busy after ${FORCE_EXIT_MS} ms, exiting anyway`);
      process.exit(1);
    }, FORCE_EXIT_MS).unref();

    try {
      // io.close() disconnects every socket and closes the HTTP server it is attached to.
      if (io) await new Promise<void>((resolve) => io.close(() => resolve()));
      else if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
      if (worker) {
        await worker.close();
        logger.info('[Shutdown] Worker finished its running jobs');
      }
      await shutdownOcr();
      await Promise.all([taskQueue.close(), deadLetterQueue.close(), closeTaskEvents()]);
      await Promise.all([redis.quit().catch(() => undefined), prisma.$disconnect()]);
      logger.info('[Shutdown] Clean exit');
      process.exit(0);
    } catch (err: any) {
      logger.error(`[Shutdown] ${err.message}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
