import type { MongooseModuleOptions } from '@nestjs/mongoose';

/** Shared by the app and the seeder so they all connect the same way. */
export const MONGO_CONNECTION_OPTIONS: MongooseModuleOptions = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
};

export function getMongoUri(env: Record<string, unknown> = process.env): string {
  const uri = env.MONGODB_URI;

  if (typeof uri !== 'string' || uri.length === 0) {
    throw new Error('MONGODB_URI is not set. Provide a MongoDB connection string.');
  }

  return uri;
}
