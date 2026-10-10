/**
 * One-off: replace full unique index on Enrollment (userId, courseId) with a partial
 * unique index so soft-deleted enrollments do not block re-enroll.
 *
 *   pnpm --filter server migrate:enrollment-unique-if-not-deleted
 *   pnpm --filter server migrate:enrollment-unique-if-not-deleted -- --prod
 *   pnpm --filter server migrate:enrollment-unique-if-not-deleted -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { Enrollment, EnrollmentSchema } from '../../enrollment/entities/enrollment.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([{ name: Enrollment.name, schema: EnrollmentSchema }]),
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
    console.log(`[migrate:enrollment-unique-if-not-deleted] skip drop (missing) ${name}`);
    return;
  }
  await collection.dropIndex(name);
  // eslint-disable-next-line no-console
  console.log(`[migrate:enrollment-unique-if-not-deleted] dropped ${name}`);
}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:enrollment-unique-if-not-deleted] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const enrollmentModel = app.get<Model<Enrollment>>(getModelToken(Enrollment.name));
  const collection = enrollmentModel.collection;

  // Legacy full unique from @Prop/@Index era (name varies by how it was created).
  await dropIndexIfExists(collection, 'userId_1_courseId_1');
  await dropIndexIfExists(collection, 'userId_courseId_unique');

  await collection.createIndex(
    { userId: 1, courseId: 1 },
    {
      unique: true,
      partialFilterExpression: { deletedAt: null },
      name: 'userId_courseId_unique_if_not_deleted',
      background: true,
    }
  );

  // eslint-disable-next-line no-console
  console.log('[migrate:enrollment-unique-if-not-deleted] ensured partial unique index');

  await app.close();
}

void bootstrap();
