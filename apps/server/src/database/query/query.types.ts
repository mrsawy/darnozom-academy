import type { PaginateOptions, PopulateOptions, RootFilterQuery, Types } from 'mongoose';

/**
 * Options for building a filter that can be scoped by organization (multi-tenant).
 */
export interface OrgScopedQueryOptions<T = unknown> {
  /** Optional organization ID to scope the query. When set, only documents for this org are returned. */
  organizationId?: string | Types.ObjectId;
  /** Additional filters to merge with the base filter. ObjectId-like string values are converted. */
  filters?: RootFilterQuery<T>;
}

/**
 * Options for list/paginated queries used across the app.
 * Extends Mongoose PaginateOptions with optional search.
 */
export interface QueryListOptions extends PaginateOptions {
  /** Optional search term (e.g. for text/regex filters). */
  search?: string;
}

/**
 * Options for find() list queries (limit, sort, skip, select, populate).
 */
export interface QueryFindOptions {
  limit?: number;
  skip?: number;
  sort?: string | Record<string, 1 | -1> | [string, 1 | -1][];
  select?: string | Record<string, number>;
  /** Path(s) to populate, or Mongoose PopulateOptions. */
  populate?: string | (string | PopulateOptions)[];
}

/**
 * Re-export commonly used Mongoose query types so the rest of the app
 * can import from a single place when building database queries.
 */
export type { PaginateOptions, PaginateResult, RootFilterQuery } from 'mongoose';
