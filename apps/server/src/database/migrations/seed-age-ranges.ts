/**
 * Idempotent migration: seed the platform age range lookup table.
 *
 * The full `seed` command wipes the database before reseeding, so it cannot be
 * used to introduce age ranges into an existing (production) database without data
 * loss. This migration upserts the default age ranges by `nameEn`, leaving
 * existing courses untouched. Running it repeatedly is safe.
 *
 *   pnpm --filter server migrate:seed-age-ranges
 *   pnpm --filter server migrate:seed-age-ranges -- --prod
 *   pnpm --filter server migrate:seed-age-ranges -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { AgeRange, AgeRangeSchema } from '../../age-range/entities/age-range.entity';
import { AgeRangeSeeder } from '../../age-range/seeds/age-range.seeder';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([{ name: AgeRange.name, schema: AgeRangeSchema }]),
  ],
})
class MigrationModule {}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:seed-age-ranges] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const ageRangeModel = app.get<Model<AgeRange>>(getModelToken(AgeRange.name));

  const seeder = new AgeRangeSeeder(ageRangeModel);
  await seeder.seed();

  const total = await ageRangeModel.countDocuments();
  // eslint-disable-next-line no-console
  console.log(`[migrate:seed-age-ranges] age ranges in database: ${total}`);

  await app.close();
}

void bootstrap();
