'use server';

import { redis } from './client';
import { parseDurationToSeconds } from '@/lib/utils';
import { DEFAULT_CACHE_TTL, QUERY_CACHE_PREFIX } from './query-cache.constants';

export async function getQueryCache<T>(queryKey: readonly unknown[]): Promise<T | null> {
  try {
    const key = QUERY_CACHE_PREFIX + JSON.stringify(queryKey);
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setQueryCache(
  queryKey: readonly unknown[],
  data: unknown,
  ttl: string = DEFAULT_CACHE_TTL
): Promise<void> {
  try {
    const key = QUERY_CACHE_PREFIX + JSON.stringify(queryKey);
    await redis.set(key, JSON.stringify(data), 'EX', parseDurationToSeconds(ttl));
  } catch {
    // non-critical — cache write failure must never surface to the user
  }
}

/** Removes a single cached entry (e.g. after a mutation that changes the same data). */
export async function deleteQueryCache(queryKey: readonly unknown[]): Promise<void> {
  try {
    const key = QUERY_CACHE_PREFIX + JSON.stringify(queryKey);
    await redis.del(key);
  } catch {
    // non-critical
  }
}
