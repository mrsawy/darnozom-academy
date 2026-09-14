import type { MongooseModuleOptions } from '@nestjs/mongoose';

/** Shared by the app and the seeder so they all connect the same way. */
export const MONGO_CONNECTION_OPTIONS: MongooseModuleOptions = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
};

export function getMongoUri(env: Record<string, unknown> = process.env): string {
  const isProd = env.NODE_ENV === 'production';
  const uri = isProd ? env.MONGODB_URI_PROD : env.MONGODB_URI_DEV;

  if (typeof uri !== 'string' || uri.length === 0) {
    const varName = isProd ? 'MONGODB_URI_PROD' : 'MONGODB_URI_DEV';
    throw new Error(`${varName} is not set. Provide a MongoDB connection string.`);
  }

  return uri;
}
