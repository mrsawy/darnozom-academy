import type { Redis as RedisInstance } from 'ioredis';

/**
 * Redis client. Uses a no-op implementation by default so the app runs without Redis.
 * Set REDIS_ENABLED=true and run Redis to enable caching.
 */
const redisEnabled = process.env.REDIS_ENABLED === 'true';

// Lazy-load real Redis only when enabled; otherwise no connection is ever made
let realRedis: RedisInstance | null = null;

async function getRealRedis(): Promise<RedisInstance | null> {
  if (!redisEnabled) return null;
  if (realRedis) return realRedis;
  const { Redis } = await import('ioredis');
  const url = process.env.REDIS_URL ?? 'redis://localhost:6380';
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });
  client.on('error', () => {
    /* redis error handler */
  });
  client.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console -- dev connection log
      console.log('[redis] Connected');
    }
  });
  realRedis = client;
  return client;
}

export const redis = {
  async get(key: string): Promise<string | null> {
    const c = await getRealRedis();
    if (!c) return null;
    try {
      return await c.get(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string, ...args: (string | number)[]): Promise<void> {
    const c = await getRealRedis();
    if (!c) return;
    try {
      await (
        c.set as unknown as (k: string, v: string, ...a: (string | number)[]) => Promise<string>
      )(key, value, ...args);
    } catch {
      // ignore
    }
  },
  async del(key: string): Promise<void> {
    const c = await getRealRedis();
    if (!c) return;
    try {
      await c.del(key);
    } catch {
      // ignore
    }
  },
};
