/**
 * Idempotent migration: seed the platform grade lookup table.
 *
 * The full `seed` command wipes the database before reseeding, so it cannot be
 * used to introduce grades into an existing (production) database without data
 * loss. This migration upserts the six Egyptian preparatory/secondary grades by
 * `nameEn`, leaving existing courses untouched (their optional `gradeId` /
 * `schoolTypeIds` fields remain empty). Running it repeatedly is safe.
 *
 *   pnpm --filter server migrate:seed-grades
 *   pnpm --filter server migrate:seed-grades -- --prod
 *   pnpm --filter server migrate:seed-grades -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { Grade, GradeSchema } from '../../grade/entities/grade.entity';
import { GradeSeeder } from '../../grade/seeds/grade.seeder';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([{ name: Grade.name, schema: GradeSchema }]),
  ],
})
class MigrationModule {}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:seed-grades] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const gradeModel = app.get<Model<Grade>>(getModelToken(Grade.name));

  const seeder = new GradeSeeder(gradeModel);
  await seeder.seed();

  const total = await gradeModel.countDocuments();
  // eslint-disable-next-line no-console
  console.log(`[migrate:seed-grades] grades in database: ${total}`);

  await app.close();
}

void bootstrap();
