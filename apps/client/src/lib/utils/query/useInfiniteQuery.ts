'use client';

import { useInfiniteQuery as useTanStackInfiniteQuery } from '@tanstack/react-query';
import type {
  InfiniteData,
  QueryFunction,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type { NatsErr } from '@/lib/utils/natsErrorHandler';
import { defaultQueryOptions } from './queryOptions';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';

export type UseAppInfiniteQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends readonly unknown[] = readonly unknown[],
  TPageParam = unknown,
> = Omit<UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'queryFn'> & {
  queryFn?: QueryFunction<TQueryFnData | NatsErr, TQueryKey, TPageParam>;
};

/**
 * useInfiniteQuery with app-wide default options (staleTime, retry, refetchOnWindowFocus).
 * Pass options to override; they take precedence over defaults.
 *
 * Automatically re-throws NATS error objects returned by server actions on the
 * client side, so Next.js cannot strip the message in production.
 *
 * Unauthenticated errors are handled globally via QueryCache in `query-client.ts`.
 */
export function useInfiniteQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends readonly unknown[] = readonly unknown[],
  TPageParam = unknown,
>(
  options: UseAppInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>
): UseInfiniteQueryResult<TData, TError> {
  const originalFn = options.queryFn;
  const safeQueryFn =
    typeof originalFn === 'function'
      ? async (...args: Parameters<typeof originalFn>) => {
          const result = await (
            originalFn as (...a: typeof args) => Promise<TQueryFnData | NatsErr>
          )(...args);
          return throwIfNatsError(result) as TQueryFnData;
        }
      : originalFn;

  return useTanStackInfiniteQuery({
    ...defaultQueryOptions,
    ...options,
    queryFn: safeQueryFn,
  } as UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>);
}
