import type { FilterQuery, PipelineStage, Types } from 'mongoose';
import mongoose from 'mongoose';

/**
 * Matches documents that are not soft-deleted.
 * In MongoDB, `{ deletedAt: null }` matches both `null` and missing field.
 *
 * Prefer this helper at call sites (explicit belt). Schema middleware should
 * apply the same filter unless `{ withDeleted: true }` is set.
 */
export const NOT_DELETED_FILTER: { deletedAt: null } = { deletedAt: null };

/** Query/aggregate option key to include soft-deleted documents. */
export const WITH_DELETED_QUERY_OPTION = 'withDeleted' as const;

export interface WithDeletedOption {
  [WITH_DELETED_QUERY_OPTION]?: boolean;
}

declare module 'mongoose' {
  interface QueryOptions {
    [WITH_DELETED_QUERY_OPTION]?: boolean;
  }
  interface PaginateOptions {
    [WITH_DELETED_QUERY_OPTION]?: boolean;
  }
}

/** Merge a query with the not-deleted constraint. */
export function withNotDeletedFilter<T extends FilterQuery<unknown>>(filter: T): T & typeof NOT_DELETED_FILTER {
  return { ...filter, ...NOT_DELETED_FILTER };
}

/** Options that opt out of soft-delete middleware (admin / audit / restore). */
export function withDeletedQueryOptions(): WithDeletedOption;
export function withDeletedQueryOptions<T>(options: T): T & WithDeletedOption;
export function withDeletedQueryOptions<T>(options?: T): (T & WithDeletedOption) | WithDeletedOption {
  return { ...(options as T), [WITH_DELETED_QUERY_OPTION]: true };
}

/**
 * `$set` payload for a soft delete: `deletedAt` + optional `deletedById`.
 * Pass the acting user's id so audit trails know who deleted the record.
 */
export function buildSoftDeleteSet(deletedById?: string | Types.ObjectId | null): {
  deletedAt: Date;
  deletedById: Types.ObjectId | null;
} {
  const deletedByOid =
    deletedById != null && mongoose.Types.ObjectId.isValid(String(deletedById)) ? new mongoose.Types.ObjectId(String(deletedById)) : null;

  return {
    deletedAt: new Date(),
    deletedById: deletedByOid,
  };
}

/** Stages allowed inside `$lookup.pipeline` (excludes top-level-only stages like `$merge`). */
type LookupPipelineStage = NonNullable<PipelineStage.Lookup['$lookup']['pipeline']>[number];

/**
 * `$lookup` that joins by `_id` and excludes soft-deleted foreign docs.
 * Schema middleware does not run inside `$lookup` pipelines.
 */
export function lookupNotDeleted(
  from: string,
  localField: string,
  as: string,
  /** Extra stages after the not-deleted `$match` (typed loosely for mongoose Lookup unions). */
  extraPipeline: readonly LookupPipelineStage[] = []
): PipelineStage.Lookup {
  return {
    $lookup: {
      from,
      localField,
      foreignField: '_id',
      pipeline: [{ $match: { ...NOT_DELETED_FILTER } }, ...extraPipeline],
      as,
    },
  };
}
