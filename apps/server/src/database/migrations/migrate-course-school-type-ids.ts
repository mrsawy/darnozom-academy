/**
 * One-off: migrate Course.schoolTypeId (scalar) → schoolTypeIds (array), then unset legacy field.
 *
 *   pnpm --filter server migrate:course-school-type-ids
 *   pnpm --filter server migrate:course-school-type-ids -- --prod
 *   pnpm --filter server migrate:course-school-type-ids -- --mongo-uri="mongodb+srv://..."
 *   pnpm --filter server migrate:course-school-type-ids -- --mongo mongodb+srv://...
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { Course, CourseSchema } from '../../course/entities/course.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
  ],
})
class MigrationModule {}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:course-school-type-ids] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const courseModel = app.get<Model<Course>>(getModelToken(Course.name));

  // Use the native collection so we can read the legacy schoolTypeId field
  // after it was removed from the Mongoose schema.
  const collection = courseModel.collection;

  interface LegacySchoolTypeDoc {
    _id: Types.ObjectId;
    schoolTypeId?: Types.ObjectId | null;
    schoolTypeIds?: Types.ObjectId[];
  }

  const withScalar = (await collection
    .find({
      schoolTypeId: { $exists: true, $ne: null, $type: 'objectId' },
    })
    .project({ _id: 1, schoolTypeId: 1, schoolTypeIds: 1 })
    .toArray()) as LegacySchoolTypeDoc[];

  let converted = 0;
  for (const doc of withScalar) {
    const existing = doc.schoolTypeIds;
    if (Array.isArray(existing) && existing.length > 0) {
      continue;
    }
    const scalar = doc.schoolTypeId;
    if (!scalar) continue;
    await collection.updateOne({ _id: doc._id }, { $set: { schoolTypeIds: [scalar] } });
    converted += 1;
  }

  const ensuredEmpty = await collection.updateMany({ schoolTypeIds: { $exists: false } }, { $set: { schoolTypeIds: [] } });

  const unsetResult = await collection.updateMany({ schoolTypeId: { $exists: true } }, { $unset: { schoolTypeId: 1 } });

  // eslint-disable-next-line no-console
  console.log(
    `[migrate:course-school-type-ids] convertedScalar=${converted} ensuredEmpty=${ensuredEmpty.modifiedCount} unsetLegacy=${unsetResult.modifiedCount}`
  );

  await app.close();
}

void bootstrap();
