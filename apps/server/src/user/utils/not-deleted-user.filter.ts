import type { FilterQuery } from 'mongoose';
import type { User } from '../entities/user.entity';
import { NOT_DELETED_FILTER, withNotDeletedFilter } from 'src/utils/soft-delete';

/**
 * Matches users that are not soft-deleted.
 * Thin User-typed alias of the shared soft-delete filter.
 */
export const NOT_DELETED_USER_FILTER: FilterQuery<User> = NOT_DELETED_FILTER;

/** Merge a query with the not-deleted constraint. */
export function withNotDeletedUserFilter<T extends FilterQuery<User>>(filter: T): T & typeof NOT_DELETED_USER_FILTER {
  return withNotDeletedFilter(filter);
}

export { WITH_DELETED_QUERY_OPTION, withDeletedQueryOptions, type WithDeletedOption } from 'src/utils/soft-delete';
