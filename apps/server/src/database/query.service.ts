import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection, Model, RootFilterQuery } from 'mongoose';

/**
 * Injectable service to run database queries consistently across the app.
 * Pass the model name (e.g. 'User', 'Role') and filters/options; the service resolves the model from the connection.
 */
@Injectable()
export class QueryService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private getModel<T>(modelName: string): Model<T> {
    return this.connection.model(modelName) as Model<T>;
  }

  async findOne<T>(
    modelName: string,
    filters: RootFilterQuery<T>,
    options?: { populate?: string | string[]; select?: string }
  ): Promise<T | null> {
    const model = this.getModel<T>(modelName);
    let query = model.findOne(filters);
    if (options?.select != null) query = query.select(options.select);
    if (options?.populate != null) {
      query = query.populate(options.populate as string);
    }
    return query.exec();
  }

  async findOneOrThrow<T>(
    modelName: string,
    filters: RootFilterQuery<T>,
    message?: string,
    options?: { populate?: string | string[]; select?: string }
  ): Promise<T> {
    const doc = await this.findOne<T>(modelName, filters, options);
    if (doc == null) {
      throw new NotFoundException(message ?? 'Resource not found');
    }
    return doc;
  }

  async find<T>(modelName: string, filters: RootFilterQuery<T>, options?: { limit?: number; skip?: number; select?: string }): Promise<T[]> {
    const model = this.getModel<T>(modelName);
    let query = model.find(filters);
    if (options?.limit != null) query = query.limit(options.limit);
    if (options?.skip != null) query = query.skip(options.skip);
    if (options?.select != null) query = query.select(options.select);
    return query.exec();
  }
}
