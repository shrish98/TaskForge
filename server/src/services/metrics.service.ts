import { Prisma, TaskStatus, TaskType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { summarise, taskDurations } from '../lib/stats.js';
import { taskQueue } from '../queues/task.queue.js';
import { deadLetterQueue } from '../queues/deadLetter.queue.js';

// Every number on the telemetry page comes from here, measured when the page asks.

const SAMPLE_SIZE = 200;
const PING_SAMPLES = 5;

function parseRedisInfo(info: string) {
  const fields: Record<string, string> = {};
  for (const line of info.split('\r\n')) {
    const i = line.indexOf(':');
    if (i > 0 && !line.startsWith('#')) fields[line.slice(0, i)] = line.slice(i + 1);
  }
  return fields;
}

/** Round trip of a Redis PING from this process, median of a few samples. */
async function redisRoundTripMs() {
  const samples: number[] = [];
  for (let i = 0; i < PING_SAMPLES; i++) {
    const started = performance.now();
    await redis.ping();
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  return Math.round(samples[Math.floor(samples.length / 2)] * 100) / 100;
}

// Managed Redis services often block INFO or CLIENT LIST; show "unavailable" rather than fail.
const optional = <T>(promise: Promise<T>) => promise.catch(() => null);

export async function getSystemMetrics(userId: string, role: 'USER' | 'ADMIN') {
  const scope: Prisma.TaskWhereInput = role === 'ADMIN' ? {} : { userId };
  const hourAgo = new Date(Date.now() - 3600_000);

  const [counts, workers, deadLetters, info, pingMs, recent, completedLastHour, failedLastHour] = await Promise.all([
    taskQueue.getJobCounts('waiting', 'prioritized', 'active', 'delayed', 'completed', 'failed'),
    optional(taskQueue.getWorkers()),
    deadLetterQueue.getJobCountByTypes('waiting', 'paused'),
    optional(redis.info()),
    optional(redisRoundTripMs()),
    prisma.task.findMany({
      where: { ...scope, status: TaskStatus.COMPLETED, startedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: SAMPLE_SIZE,
      select: { type: true, createdAt: true, scheduledAt: true, startedAt: true, completedAt: true },
    }),
    prisma.task.count({ where: { ...scope, status: TaskStatus.COMPLETED, completedAt: { gte: hourAgo } } }),
    prisma.task.count({ where: { ...scope, status: TaskStatus.FAILED, failedAt: { gte: hourAgo } } }),
  ]);

  const timed = recent.map((t) => ({ type: t.type, ...taskDurations(t) }));
  const runs = (rows: typeof timed) => rows.map((t) => t.runMs).filter((v): v is number => v !== null);
  const redisInfo = info ? parseRedisInfo(info) : null;

  return {
    queue: {
      waiting: counts.waiting + counts.prioritized,
      active: counts.active,
      delayed: counts.delayed,
      completedRetained: counts.completed,
      failedRetained: counts.failed,
      deadLetter: deadLetters,
    },
    workers: workers
      ? { online: workers.length, names: workers.map((w) => w.name).filter(Boolean) }
      : null,
    throughput: { completedLastHour, failedLastHour },
    timings: {
      sampleSize: timed.length,
      queueWait: summarise(timed.map((t) => t.waitMs).filter((v): v is number => v !== null)),
      run: summarise(runs(timed)),
      runByType: Object.fromEntries(
        Object.values(TaskType).map((type) => [type, summarise(runs(timed.filter((t) => t.type === type)))])
      ),
    },
    redis: redisInfo
      ? {
          version: redisInfo.redis_version ?? null,
          usedMemory: redisInfo.used_memory_human ?? null,
          maxMemoryPolicy: redisInfo.maxmemory_policy ?? null,
          connectedClients: Number(redisInfo.connected_clients) || null,
          opsPerSec: Number(redisInfo.instantaneous_ops_per_sec) || 0,
          aofEnabled: redisInfo.aof_enabled === '1',
          roundTripMs: pingMs,
        }
      : { roundTripMs: pingMs },
    measuredAt: new Date().toISOString(),
  };
}
