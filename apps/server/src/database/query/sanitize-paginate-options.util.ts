import type { PaginateOptions } from 'mongoose';
import { QUERY_DEFAULT_LIMIT, QUERY_DEFAULT_PAGE, QUERY_MAX_LIMIT } from './query.constants';

/**
 * Sanitizes pagination options (page, limit) with defaults and caps.
 * Use before passing options to Model.paginate() to avoid unbounded queries.
 *
 * @param options - Raw options (e.g. from query params or RPC payload).
 * @returns Options with page >= 1, limit in [1, QUERY_MAX_LIMIT], and defaults applied.
 */
export function sanitizePaginateOptions(options: Partial<PaginateOptions> | undefined): PaginateOptions {
  const opts = options ?? {};
  const page = Math.max(1, Math.floor(Number(opts.page)) || QUERY_DEFAULT_PAGE);
  let limit = Math.floor(Number(opts.limit)) || QUERY_DEFAULT_LIMIT;
  limit = Math.max(1, Math.min(limit, QUERY_MAX_LIMIT));

  return {
    ...opts,
    page,
    limit,
  } as PaginateOptions;
}
