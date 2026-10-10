'use client';

import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import type { QueryFunction, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { NatsErr } from '@/lib/utils/natsErrorHandler';
import { defaultQueryOptions } from './queryOptions';
import { getQueryCache, setQueryCache } from '@/lib/redis/query-cache';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';

export interface CacheOptions {
  /** When true, checks Redis before calling queryFn and stores the result on miss. Default: false. */
  cached?: boolean;
  /** TTL for the cached result (e.g. '5h', '30m'). Only used when cached is true. Default: '5m'. */
  cacheTtl?: string;
}

/** Server actions return `T | NatsErr`; this hook narrows via `throwIfNatsError` before TanStack Query sees the result. */
export type UseAppQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn'> &
  CacheOptions & {
    queryFn?: QueryFunction<TQueryFnData | NatsErr, TQueryKey>;
  };

/**
 * useQuery with app-wide default options (staleTime, retry, refetchOnWindowFocus).
 * Pass options to override; they take precedence over defaults.
 *
 * When `cached: true`, the queryFn result is stored in Redis under `qc:<queryKey>`.
 * On the next call the cached value is returned immediately, bypassing the queryFn.
 * Set `cacheTtl` to control how long the result is kept (default: '5m').
 *
 * Unauthenticated errors are handled globally via QueryCache in `query-client.ts`.
 */
export function useQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>(
  options: UseAppQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const { cached = false, cacheTtl, ...queryOptions } = options;

  const originalFn = queryOptions.queryFn;
  const queryFn =
    cached && typeof originalFn === 'function'
      ? async (...args: Parameters<typeof originalFn>) => {
          const hit = await getQueryCache<TQueryFnData>(
            queryOptions.queryKey as readonly unknown[]
          );
          if (hit !== null) return hit;
          const result = await (
            originalFn as (...a: typeof args) => Promise<TQueryFnData | NatsErr>
          )(...args);
          const data = throwIfNatsError(result) as TQueryFnData;
          // fire-and-forget: writing to cache is non-critical and must not delay the response
          void setQueryCache(queryOptions.queryKey as readonly unknown[], data, cacheTtl);
          return data;
        }
      : typeof originalFn === 'function'
        ? async (...args: Parameters<typeof originalFn>) => {
            const result = await (
              originalFn as (...a: typeof args) => Promise<TQueryFnData | NatsErr>
            )(...args);
            return throwIfNatsError(result) as TQueryFnData;
          }
        : originalFn;

  return useTanStackQuery({
    ...defaultQueryOptions,
    ...queryOptions,
    queryFn,
  } as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>);
}
