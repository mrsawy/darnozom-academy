import { Types } from 'mongoose';
import type { RootFilterQuery } from 'mongoose';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import type { OrgScopedQueryOptions } from './query.types';

/**
 * Builds a Mongoose filter with optional organization scoping and ObjectId conversion.
 * Use this when building filters for find/paginate across the app to keep behavior consistent.
 *
 * @param options - Organization ID and/or additional filters. Pass an empty object for no extra filters.
 * @returns A filter object suitable for Model.find(), Model.findOne(), or Model.paginate().
 *
 * @example
 * // With organization scoping
 * const filter = buildOrgScopedFilter<User>({ organizationId: req.user.organizationId, filters: { status: 'active' } });
 * await this.userModel.paginate(filter, options);
 *
 * @example
 * // Filters only (no org)
 * const filter = buildOrgScopedFilter<Course>({ filters: { _id: courseId } });
 */
export function buildOrgScopedFilter<T = unknown>(options: OrgScopedQueryOptions<T>): RootFilterQuery<T> {
  const { organizationId, filters = {} } = options;

  const base = (convertObjectValuesToObjectId(filters) as RootFilterQuery<T>) || ({} as RootFilterQuery<T>);

  if (organizationId != null && organizationId !== '') {
    const orgId = typeof organizationId === 'string' ? new Types.ObjectId(organizationId) : organizationId;
    return {
      ...base,
      organizationId: orgId,
    } as RootFilterQuery<T>;
  }

  return base;
}

/**
 * Converts filter object values that look like ObjectIds (strings) into Types.ObjectId.
 * Use when you already have a full filter and only need normalization (e.g. from query params).
 *
 * @param filters - Raw filter object (e.g. from request payload).
 * @returns Same shape with string IDs converted to ObjectId; invalid IDs throw BadRequestException.
 */
export function buildFilter<T = unknown>(filters: RootFilterQuery<T>): RootFilterQuery<T> {
  if (!filters || (typeof filters === 'object' && Object.keys(filters).length === 0)) {
    return {} as RootFilterQuery<T>;
  }

  return convertObjectValuesToObjectId({ ...filters }) as RootFilterQuery<T>;
}
