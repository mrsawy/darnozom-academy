/**
 * One-off: replace full unique indexes on Grade/SchoolType nameEn/nameAr with
 * partial unique indexes so soft-deleted rows do not block recreating the same name.
 *
 *   pnpm --filter server migrate:grade-schooltype-unique-if-not-deleted
 *   pnpm --filter server migrate:grade-schooltype-unique-if-not-deleted -- --prod
 *   pnpm --filter server migrate:grade-schooltype-unique-if-not-deleted -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { Grade, GradeSchema } from '../../grade/entities/grade.entity';
import { SchoolType, SchoolTypeSchema } from '../../school-type/entities/school-type.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([
      { name: Grade.name, schema: GradeSchema },
      { name: SchoolType.name, schema: SchoolTypeSchema },
    ]),
  ],
})
class MigrationModule {}

async function dropIndexIfExists(
  collection: { indexes: () => Promise<{ name?: string }[]>; dropIndex: (name: string) => Promise<unknown> },
  name: string,
  label: string
) {
  const indexes = await collection.indexes();
  if (!indexes.some((index) => index.name === name)) {
    // eslint-disable-next-line no-console
    console.log(`[migrate:grade-schooltype-unique-if-not-deleted] ${label}: skip drop (missing) ${name}`);
    return;
  }
  await collection.dropIndex(name);
  // eslint-disable-next-line no-console
  console.log(`[migrate:grade-schooltype-unique-if-not-deleted] ${label}: dropped ${name}`);
}

async function ensureNamePartialUniques(
  collection: {
    createIndex: (
      keys: Record<string, 1>,
      options: { unique: true; partialFilterExpression: { deletedAt: null }; name: string; background: true }
    ) => Promise<unknown>;
  },
  label: string
) {
  for (const field of ['nameEn', 'nameAr'] as const) {
    await collection.createIndex(
      { [field]: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null },
        name: `${field}_unique_if_not_deleted`,
        background: true,
      }
    );
    // eslint-disable-next-line no-console
    console.log(`[migrate:grade-schooltype-unique-if-not-deleted] ${label}: ensured ${field}_unique_if_not_deleted`);
  }
}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:grade-schooltype-unique-if-not-deleted] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const gradeModel = app.get<Model<Grade>>(getModelToken(Grade.name));
  const schoolTypeModel = app.get<Model<SchoolType>>(getModelToken(SchoolType.name));

  for (const [label, model] of [
    ['grades', gradeModel],
    ['schooltypes', schoolTypeModel],
  ] as const) {
    const collection = model.collection;
    await dropIndexIfExists(collection, 'nameEn_1', label);
    await dropIndexIfExists(collection, 'nameAr_1', label);
    await ensureNamePartialUniques(collection, label);
  }

  await app.close();
}

void bootstrap();
