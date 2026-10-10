/**
 * Query utilities: TanStack Query hooks with app-wide default options.
 * Use these instead of importing from @tanstack/react-query directly.
 */

export { useQuery, type CacheOptions } from './useQuery';
export { useMutation } from './useMutation';
export { useInfiniteQuery } from './useInfiniteQuery';
export { useQueryClient } from './useQueryClient';
export { queryClient } from './query-client';

export {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

export {
  defaultQueryOptions,
  defaultMutationOptions,
  DEFAULT_STALE_TIME_MS,
  DEFAULT_RETRY,
  withDefaultQueryOptions,
  withDefaultMutationOptions,
} from './queryOptions';

export { QUERY_CACHE_PREFIX, DEFAULT_CACHE_TTL } from '@/lib/redis/query-cache.constants';
