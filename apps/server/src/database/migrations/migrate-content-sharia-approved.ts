/**
 * Idempotent migration: grandfather all existing course content as APPROVED.
 *
 * Content created before Sharia review was already shown to students. Making it
 * pending would blank every course on deploy. This migration creates version 1
 * (marked APPROVED with comment SHARIA_MIGRATED_COMMENT) for every content item
 * whose shariaStatus is not APPROVED, and stamps the content with:
 *   shariaStatus = APPROVED, currentVersion = 1, pendingVersion = null.
 *
 * Running it repeatedly is safe.
 *
 *   pnpm --filter server migrate:content-sharia
 *   pnpm --filter server migrate:content-sharia -- --prod
 *   pnpm --filter server migrate:content-sharia -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SHARIA_MIGRATED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { CourseContent, CourseContentSchema } from '../../course/entities/course-content.entity';
import { ContentVersion, ContentVersionSchema } from '../../course/entities/content-version.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const EXCLUDED_FROM_SNAPSHOT = new Set([
  '_id',
  '__v',
  'organizationId',
  'courseId',
  'createdAt',
  'updatedAt',
  'approvalStatus',
  'approvalComment',
  'reviewedBy',
  'reviewedAt',
  'pendingUpdate',
  'shariaStatus',
  'currentVersion',
  'pendingVersion',
  'deletedAt',
  'deletedById',
]);

export interface MigrationVersion {
  organizationId: Types.ObjectId;
  contentId: Types.ObjectId;
  courseId: Types.ObjectId;
  version: 1;
  changes: Record<string, unknown>;
  createdBy: null;
  shariaStatus: ShariaStatus;
  reviewedBy: null;
  reviewedAt: Date;
  reviewComment: string;
}

/**
 * Version 1 for a content item that predates Sharia review. It is approved, because the academy was
 * already showing it to students: making it pending would blank every course on deploy.
 */
export function buildMigrationVersion(
  content: Record<string, unknown> & { _id: Types.ObjectId; organizationId: Types.ObjectId; courseId: Types.ObjectId }
): MigrationVersion {
  const changes = Object.fromEntries(Object.entries(content).filter(([key]) => !EXCLUDED_FROM_SNAPSHOT.has(key)));
  return {
    organizationId: content.organizationId,
    contentId: content._id,
    courseId: content.courseId,
    version: 1,
    changes,
    createdBy: null,
    shariaStatus: ShariaStatus.APPROVED,
    reviewedBy: null,
    reviewedAt: new Date(),
    reviewComment: SHARIA_MIGRATED_COMMENT,
  };
}

export async function migrate(
  contentModel: Model<CourseContent>,
  versionModel: Model<ContentVersion>
): Promise<{ stamped: number; versioned: number }> {
  const contents = await contentModel
    .find({ shariaStatus: { $ne: ShariaStatus.APPROVED } })
    .lean()
    .exec();

  let versioned = 0;
  for (const content of contents) {
    const exists = await versionModel.countDocuments({ contentId: content._id, version: 1 }).exec();
    if (exists === 0) {
      await versionModel.create(buildMigrationVersion(content as never));
      versioned += 1;
    }
  }

  const stamped = await contentModel
    .updateMany(
      { shariaStatus: { $ne: ShariaStatus.APPROVED } },
      { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: 1, pendingVersion: null } }
    )
    .exec();

  return { stamped: stamped.modifiedCount, versioned };
}

const { uri: mongoUri, source: mongoUriSource } =
  process.env.NODE_ENV === 'test' ? { uri: 'mongodb://localhost:27017/test', source: 'env' as const } : resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: ContentVersion.name, schema: ContentVersionSchema },
    ]),
  ],
})
class MigrationModule {}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:content-sharia] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const contentModel = app.get<Model<CourseContent>>(getModelToken(CourseContent.name));
  const versionModel = app.get<Model<ContentVersion>>(getModelToken(ContentVersion.name));

  const result = await migrate(contentModel, versionModel);

  // eslint-disable-next-line no-console
  console.log(`[migrate:content-sharia] versioned=${result.versioned} stamped=${result.stamped}`);

  await app.close();
}

/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
