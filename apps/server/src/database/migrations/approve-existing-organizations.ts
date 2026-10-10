/**
 * One-off migration: grandfather all existing organizations as APPROVED.
 *
 * The account-approval gate defaults new orgs to PENDING. Existing orgs were
 * already operating, so they must be flipped to APPROVED (only where the field
 * is missing or still PENDING with no admin review) to avoid locking them out.
 *
 * Run once after deploying the approval feature:
 *   pnpm --filter server migrate:approve-orgs
 *   pnpm --filter server migrate:approve-orgs -- --prod
 *   pnpm --filter server migrate:approve-orgs -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApprovalStatus } from '@lms-organization/shared-types';
import { MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { Organization, OrganizationSchema } from '../../organization/entities/organization.entity';
import { resolveMigrationMongoUri } from './migration-mongo.util';

const { uri: mongoUri, source: mongoUriSource } = resolveMigrationMongoUri();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(mongoUri, MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }]),
  ],
})
class MigrationModule {}

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:approve-orgs] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const organizationModel = app.get<Model<Organization>>(getModelToken(Organization.name));

  // Only touch orgs that are not already decided by an admin: missing field or
  // still PENDING without a recorded review. Never override an admin REJECTED.
  const filter = {
    $or: [{ approvalStatus: { $exists: false } }, { approvalStatus: ApprovalStatus.PENDING, approvalReviewedAt: null }],
  };

  const result = await organizationModel.updateMany(filter, {
    $set: {
      approvalStatus: ApprovalStatus.APPROVED,
      approvalComment: null,
      approvalReviewedAt: new Date(),
    },
  });

  // eslint-disable-next-line no-console
  console.log(`[migrate:approve-orgs] matched=${result.matchedCount} modified=${result.modifiedCount}`);

  await app.close();
}

void bootstrap();
