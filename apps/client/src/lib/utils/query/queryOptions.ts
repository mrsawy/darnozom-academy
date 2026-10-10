/**
 * Default options for TanStack Query hooks.
 * Use these via the useQuery, useMutation, useInfiniteQuery wrappers in this folder
 * so all queries share consistent behavior; pass options to override per-call.
 */

/** Default stale time: 5 minutes (data considered fresh, no refetch). */
export const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

/** Default retry count for failed queries. */
export const DEFAULT_RETRY = 2;

/** Default options applied to useQuery / useInfiniteQuery when using the wrappers. */
export const defaultQueryOptions = {
  staleTime: DEFAULT_STALE_TIME_MS,
  retry: DEFAULT_RETRY,
  refetchOnWindowFocus: false,
} as const;

/** Default options applied to useMutation when using the wrapper. */
export const defaultMutationOptions = {
  retry: 0,
} as const;

/**
 * Merges default query options with custom options. Custom options take precedence.
 */
export function withDefaultQueryOptions<T extends Record<string, unknown>>(
  customOptions: T
): T & typeof defaultQueryOptions {
  return { ...defaultQueryOptions, ...customOptions } as T & typeof defaultQueryOptions;
}

/**
 * Merges default mutation options with custom options. Custom options take precedence.
 */
export function withDefaultMutationOptions<T extends Record<string, unknown>>(
  customOptions: T
): T & typeof defaultMutationOptions {
  return { ...defaultMutationOptions, ...customOptions } as T & typeof defaultMutationOptions;
}
