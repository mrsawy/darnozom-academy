import type { FilterQuery } from 'mongoose';
import type { CourseContent } from '../entities/course-content.entity';
import { NOT_DELETED_FILTER, withNotDeletedFilter } from 'src/utils/soft-delete';

/**
 * Matches course contents that are not soft-deleted (`deletedAt` is the source of truth).
 * Thin content-typed alias of the shared soft-delete filter.
 */
export const NOT_DELETED_CONTENT_FILTER: FilterQuery<CourseContent> = NOT_DELETED_FILTER;

/** Merge a query with the not-deleted constraint. */
export function withNotDeletedContentFilter<T extends FilterQuery<CourseContent>>(filter: T): T & typeof NOT_DELETED_CONTENT_FILTER {
  return withNotDeletedFilter(filter);
}
