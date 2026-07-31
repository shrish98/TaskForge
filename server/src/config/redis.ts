import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConfig = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null, // Required by BullMQ
};

export const redis = new Redis({
  ...redisConfig,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log(`🔴 [Redis] Connected to Redis instance at ${redisHost}:${redisPort}`);
});

redis.on('error', (err) => {
  console.error('❌ [Redis] Connection Error:', err.message);
});
