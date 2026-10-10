'use client';

import { useMemo } from 'react';
import { useQueryClient as useTanStackQueryClient } from '@tanstack/react-query';
import { deleteQueryCache } from '@/lib/redis/query-cache';

/**
 * Drop-in replacement for TanStack's useQueryClient.
 *
 * The returned client behaves identically except `invalidateQueries`
 * also evicts every matching key from the Redis query cache, so a
 * subsequent refetch always hits the real data source.
 */
export function useQueryClient() {
  const queryClient = useTanStackQueryClient();

  return useMemo(
    () =>
      new Proxy(queryClient, {
        get(target, prop, receiver): unknown {
          if (prop === 'invalidateQueries') {
            return async (...args: Parameters<typeof target.invalidateQueries>) => {
              const [filters] = args;
              if (filters) {
                const matching = target.getQueryCache().findAll(filters);
                await Promise.all(matching.map((q) => deleteQueryCache(q.queryKey)));
              }
              return target.invalidateQueries(...args);
            };
          }

          const value: unknown = Reflect.get(target, prop, receiver);
          if (typeof value === 'function') {
            return (value as (...a: unknown[]) => unknown).bind(target);
          }
          return value;
        },
      }),
    [queryClient]
  );
}
