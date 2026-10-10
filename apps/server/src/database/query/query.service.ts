import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection, Model, PaginateModel, PaginateOptions, PaginateResult, RootFilterQuery } from 'mongoose';

import { buildFilter, buildOrgScopedFilter } from './build-filter.util';
import type { OrgScopedQueryOptions, QueryFindOptions } from './query.types';
import { sanitizePaginateOptions } from './sanitize-paginate-options.util';

/**
 * Injectable service to run database queries consistently across the app.
 * Pass the model name (e.g. 'User', 'Role') and filters/options; the service resolves the model from the connection.
 * Filters are normalized (e.g. string IDs → ObjectId) and pagination options are sanitized.
 */
@Injectable()
export class QueryService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private getModel<T>(modelName: string): Model<T> {
    return this.connection.model(modelName) as Model<T>;
  }

  private getPaginateModel<T>(modelName: string): PaginateModel<T> {
    return this.connection.model(modelName) as PaginateModel<T>;
  }

  /**
   * Find a single document by filter. Returns null if not found.
   * Optional options (e.g. populate, select) for richer queries.
   */
  async findOne<T>(modelName: string, filters: RootFilterQuery<T>, options?: Pick<QueryFindOptions, 'populate' | 'select'>): Promise<T | null> {
    const model = this.getModel<T>(modelName);
    const filter = buildFilter<T>(filters);
    let query = model.findOne(filter);
    if (options?.select != null) query = query.select(options.select);
    if (options?.populate != null) {
      const pop = options.populate;
      query = typeof pop === 'string' ? query.populate(pop) : query.populate(pop);
    }
    return query.exec();
  }

  /**
   * Find a single document and throw NotFoundException if not found.
   */
  async findOneOrThrow<T>(
    modelName: string,
    filters: RootFilterQuery<T>,
    message?: string,
    options?: Pick<QueryFindOptions, 'populate' | 'select'>
  ): Promise<T> {
    const doc = await this.findOne<T>(modelName, filters, options);
    if (doc == null) {
      throw new NotFoundException(message ?? 'Resource not found');
    }
    return doc;
  }

  /**
   * Find many documents with optional limit, sort, skip, select, populate.
   */
  async find<T>(modelName: string, filters: RootFilterQuery<T>, options?: QueryFindOptions): Promise<T[]> {
    const model = this.getModel<T>(modelName);
    const filter = buildFilter<T>(filters);
    let query = model.find(filter);
    if (options?.limit != null) query = query.limit(options.limit);
    if (options?.skip != null) query = query.skip(options.skip);
    // eslint-disable-next-line unicorn/no-array-sort
    if (options?.sort != null) query = query.sort(options.sort);
    if (options?.select != null) query = query.select(options.select);
    if (options?.populate != null) {
      const pop = options.populate;
      query = typeof pop === 'string' ? query.populate(pop) : query.populate(pop);
    }
    return query.exec();
  }

  /**
   * Paginate documents. Sanitizes pagination options (page, limit) before running.
   */
  async paginate<T>(modelName: string, filters: RootFilterQuery<T>, options: PaginateOptions): Promise<PaginateResult<T>> {
    const model = this.getPaginateModel<T>(modelName);
    const filter = buildFilter<T>(filters);
    const sanitized = sanitizePaginateOptions(options);
    return model.paginate(filter, sanitized);
  }

  /**
   * Build a filter with optional organization scoping, then run paginate.
   * Convenience for the common case: org-scoped list with raw pagination options from the client.
   */
  async paginateScoped<T>(
    modelName: string,
    queryOptions: OrgScopedQueryOptions<T> & { paginateOptions: PaginateOptions }
  ): Promise<PaginateResult<T>> {
    const { paginateOptions, ...scopeOptions } = queryOptions;
    const filter = buildOrgScopedFilter<T>(scopeOptions);
    return this.paginate<T>(modelName, filter, paginateOptions);
  }

  /**
   * Build a filter with optional organization scoping, then find one. Throws if not found.
   */
  async findOneScopedOrThrow<T>(modelName: string, queryOptions: OrgScopedQueryOptions<T>, message?: string): Promise<T> {
    const filter = buildOrgScopedFilter<T>(queryOptions);
    return this.findOneOrThrow<T>(modelName, filter, message);
  }

  /**
   * Build a filter with optional organization scoping, then find one. Returns null if not found.
   */
  async findOneScoped<T>(modelName: string, queryOptions: OrgScopedQueryOptions<T>): Promise<T | null> {
    const filter = buildOrgScopedFilter<T>(queryOptions);
    return this.findOne<T>(modelName, filter);
  }

  /**
   * Build a filter with optional organization scoping, then find many.
   */
  async findScoped<T>(modelName: string, queryOptions: OrgScopedQueryOptions<T> & { findOptions?: QueryFindOptions }): Promise<T[]> {
    const { findOptions, ...scopeOptions } = queryOptions;
    const filter = buildOrgScopedFilter<T>(scopeOptions);
    return this.find<T>(modelName, filter, findOptions);
  }
}
