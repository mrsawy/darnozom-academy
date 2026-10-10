/**
 * Default options for the shared axios API client.
 * Use the `api` instance from this folder instead of importing axios directly
 * so all requests share consistent defaults; pass config per call to override.
 */

import type { CreateAxiosDefaults } from 'axios';

/** Default request timeout in ms (30 seconds). */
export const DEFAULT_TIMEOUT_MS = 30 * 1000;

/** Optional base URL for API requests (e.g. from NEXT_PUBLIC_API_URL). */
export const DEFAULT_BASE_URL =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : undefined;

/** Default config applied to the shared axios instance. */
export const defaultApiOptions: CreateAxiosDefaults = {
  timeout: DEFAULT_TIMEOUT_MS,
  ...(DEFAULT_BASE_URL && { baseURL: DEFAULT_BASE_URL }),
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Merges default API options with custom config. Custom config takes precedence.
 */
export function withDefaultApiOptions<T extends CreateAxiosDefaults>(
  customConfig: T
): T & CreateAxiosDefaults {
  return { ...defaultApiOptions, ...customConfig } as T & CreateAxiosDefaults;
}
