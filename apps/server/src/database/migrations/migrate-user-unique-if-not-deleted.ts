/**
 * One-off: replace full unique indexes on User.email / User.username with partial
 * unique indexes so soft-deleted users do not block re-registration.
 * Also refreshes phone/googleId partials to exclude soft-deleted rows.
 *
 *   pnpm --filter server migrate:user-unique-if-not-deleted
 *   pnpm --filter server migrate:user-unique-if-not-deleted -- --prod
 *   pnpm --filter server migrate:user-unique-if-not-deleted -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { User, UserSchema } from '../../user/entities/user.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
})
class MigrationModule {}

async function dropIndexIfExists(
  collection: { indexes: () => Promise<{ name?: string }[]>; dropIndex: (name: string) => Promise<unknown> },
  name: string
) {
  const indexes = await collection.indexes();
  if (!indexes.some((index) => index.name === name)) {
    // eslint-disable-next-line no-console
    console.log(`[migrate:user-unique-if-not-deleted] skip drop (missing) ${name}`);
    return;
  }
  await collection.dropIndex(name);
  // eslint-disable-next-line no-console
  console.log(`[migrate:user-unique-if-not-deleted] dropped ${name}`);
}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:user-unique-if-not-deleted] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const collection = userModel.collection;

  await dropIndexIfExists(collection, 'username_1');
  await dropIndexIfExists(collection, 'email_1');
  // Recreate phone/googleId uniques so soft-deleted users do not block reclaim.
  await dropIndexIfExists(collection, 'phone_unique_if_set');
  await dropIndexIfExists(collection, 'googleId_unique_if_set');

  await collection.createIndex(
    { username: 1 },
    {
      unique: true,
      partialFilterExpression: { deletedAt: null },
      name: 'username_unique_if_not_deleted',
      background: true,
    }
  );
  await collection.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: { deletedAt: null },
      name: 'email_unique_if_not_deleted',
      background: true,
    }
  );
  await collection.createIndex(
    { phone: 1 },
    {
      unique: true,
      partialFilterExpression: { phone: { $type: 'string' }, deletedAt: null },
      name: 'phone_unique_if_set',
      background: true,
    }
  );
  await collection.createIndex(
    { googleId: 1 },
    {
      unique: true,
      partialFilterExpression: { googleId: { $type: 'string' }, deletedAt: null },
      name: 'googleId_unique_if_set',
      background: true,
    }
  );

  // eslint-disable-next-line no-console
  console.log('[migrate:user-unique-if-not-deleted] ensured partial unique indexes');

  await app.close();
}

void bootstrap();
