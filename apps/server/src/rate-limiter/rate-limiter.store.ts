import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface SlidingWindowEntry {
  timestamps: number[];
}

const DEFAULT_CLEANUP_TTL_MS = 120_000;

@Injectable()
export class RateLimiterStore implements OnModuleDestroy {
  private readonly store = new Map<string, SlidingWindowEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private maxObservedTtlMs = DEFAULT_CLEANUP_TTL_MS;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Record a hit and return whether the request is allowed.
   * Uses a sliding-window counter: keeps timestamps within the last `ttlSeconds`.
   */
  hit(key: string, ttlSeconds: number, maxRequests: number): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const ttlMs = ttlSeconds * 1000;
    if (ttlMs > this.maxObservedTtlMs) {
      this.maxObservedTtlMs = ttlMs;
    }

    const now = Date.now();
    const windowStart = now - ttlMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + ttlMs - now;
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: maxRequests - entry.timestamps.length, retryAfterMs: 0 };
  }

  private cleanup() {
    const now = Date.now();
    const cutoff = now - this.maxObservedTtlMs;
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}
