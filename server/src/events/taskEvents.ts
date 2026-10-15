import Redis from 'ioredis';
import { TaskStatus } from '@prisma/client';
import { redisConfig } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// The worker can run in its own container, where there is no Socket.IO server to emit on. So it
// publishes task changes to a Redis channel, and every API instance forwards them to the right
// user's sockets. The same path works when the worker runs inside the API process.
const CHANNEL = 'taskforge:task-events';

export interface TaskEvent {
  userId: string;
  taskId: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  error?: string | null;
}

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

export async function publishTaskEvent(event: TaskEvent) {
  publisher ??= new Redis(redisConfig);
  try {
    await publisher.publish(CHANNEL, JSON.stringify({ ...event, timestamp: new Date().toISOString() }));
  } catch (err: any) {
    // A missed live update isn't worth failing a job over; the dashboard refetches on reconnect.
    logger.warn(`Could not publish event for task ${event.taskId}: ${err.message}`);
  }
}

export async function subscribeTaskEvents(onEvent: (event: TaskEvent & { timestamp: string }) => void) {
  subscriber = new Redis(redisConfig);
  subscriber.on('message', (_channel, raw) => {
    try {
      onEvent(JSON.parse(raw));
    } catch (err: any) {
      logger.warn(`Ignoring malformed task event: ${err.message}`);
    }
  });
  await subscriber.subscribe(CHANNEL);
}

export async function closeTaskEvents() {
  await Promise.all([publisher?.quit(), subscriber?.quit()]);
  publisher = subscriber = null;
}
