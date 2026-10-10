import type { Aggregate, Query, Schema } from 'mongoose';
import { NOT_DELETED_FILTER, WITH_DELETED_QUERY_OPTION } from './not-deleted.filter';

interface OptionsWithDeleted {
  [WITH_DELETED_QUERY_OPTION]?: boolean;
}

function shouldIncludeDeleted(options: OptionsWithDeleted | undefined): boolean {
  return options?.[WITH_DELETED_QUERY_OPTION] === true;
}

/**
 * Applies soft-delete defaults on a Mongoose schema:
 * - find* / countDocuments / update* / delete* exclude soft-deleted docs
 * - aggregate prepends `{ $match: { deletedAt: null } }`
 * - pass `{ withDeleted: true }` via query/aggregate options to opt out
 *
 * Call-site helpers in `not-deleted.filter.ts` remain as a second belt.
 * For `$lookup` pipelines (no schema middleware), spread `NOT_DELETED_FILTER` explicitly.
 */
export function applySoftDeleteMiddleware(schema: Schema, notDeletedFilter: { deletedAt: null } = NOT_DELETED_FILTER): void {
  const excludeFromQuery = function (this: Query<unknown, unknown>) {
    if (shouldIncludeDeleted(this.getOptions() as OptionsWithDeleted)) {
      return;
    }
    this.where(notDeletedFilter);
  };

  schema.pre(/^find/, excludeFromQuery);
  schema.pre('countDocuments', excludeFromQuery);
  schema.pre('updateOne', excludeFromQuery);
  schema.pre('updateMany', excludeFromQuery);
  schema.pre('replaceOne', excludeFromQuery);
  schema.pre('deleteOne', excludeFromQuery);
  schema.pre('deleteMany', excludeFromQuery);

  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    if (shouldIncludeDeleted(this.options as OptionsWithDeleted)) {
      return;
    }
    this.pipeline().unshift({ $match: notDeletedFilter });
  });
}
