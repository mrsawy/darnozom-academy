/**
 * One-off: backfill PrivateSession soft-delete fields for rows that only used
 * `status: DELETED` (pre-deletedAt pattern). Sets `deletedAt` so schema middleware
 * hides them the same way as new soft-deletes.
 *
 *   pnpm --filter server migrate:private-session-soft-delete
 *   pnpm --filter server migrate:private-session-soft-delete -- --prod
 *   pnpm --filter server migrate:private-session-soft-delete -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityStatus } from '@lms-organization/shared-types';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { PrivateSession, PrivateSessionSchema } from '../../private-session/entities/private-session.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([{ name: PrivateSession.name, schema: PrivateSessionSchema }]),
  ],
})
class MigrationModule {}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:private-session-soft-delete] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const privateSessionModel = app.get<Model<PrivateSession>>(getModelToken(PrivateSession.name));
  const collection = privateSessionModel.collection;

  const result = await collection.updateMany(
    {
      status: EntityStatus.DELETED,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    },
    {
      $set: {
        deletedAt: new Date(),
        isActive: false,
      },
    }
  );

  // eslint-disable-next-line no-console
  console.log(`[migrate:private-session-soft-delete] matched=${result.matchedCount} modified=${result.modifiedCount}`);

  await app.close();
}

void bootstrap();
