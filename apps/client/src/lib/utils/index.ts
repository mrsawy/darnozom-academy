/**
 * Shared client utilities.
 */

export {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  defaultQueryOptions,
  defaultMutationOptions,
  DEFAULT_STALE_TIME_MS,
  DEFAULT_RETRY,
  withDefaultQueryOptions,
  withDefaultMutationOptions,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
} from './query';

export {
  api,
  defaultApiOptions,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_BASE_URL,
  withDefaultApiOptions,
  isAxiosError,
  isCancel,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from './api';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a duration string and converts it to seconds.
 * Supports formats like "5h", "30m", "45s", "2d", etc.
 *
 * @param duration - Duration string (e.g., "5h", "30m", "45s", "2d")
 * @returns Total duration in seconds
 * @example
 * parseDurationToSeconds("5h") // returns 18000
 * parseDurationToSeconds("30m") // returns 1800
 * parseDurationToSeconds("45s") // returns 45
 * parseDurationToSeconds("2d") // returns 172800
 */
export function parseDurationToSeconds(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    throw new Error('Duration must be a non-empty string');
  }

  // Match number and unit (e.g., "5h", "30m", "45s")
  const match = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/.exec(duration.trim());

  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Expected format like "5h", "30m", "45s"`
    );
  }

  const value = Number.parseFloat(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  // Convert to seconds based on unit
  const multipliers: Record<string, number> = {
    // Seconds
    s: 1,
    sec: 1,
    secs: 1,
    second: 1,
    seconds: 1,
    // Minutes
    m: 60,
    min: 60,
    mins: 60,
    minute: 60,
    minutes: 60,
    // Hours
    h: 3600,
    hr: 3600,
    hrs: 3600,
    hour: 3600,
    hours: 3600,
    // Days
    d: 86_400,
    day: 86_400,
    days: 86_400,
  };

  const multiplier = multipliers[unit];

  if (multiplier === undefined) {
    throw new Error(`Unknown time unit: ${unit}. Supported units: s, m, h, d`);
  }

  return Math.floor(value * multiplier);
}
export { isFileImage } from './files/isFileImage';
