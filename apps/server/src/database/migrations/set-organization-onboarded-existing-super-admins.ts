/**
 * One-off: grandfather existing SuperAdmins as organization-onboarded.
 *
 *   pnpm --filter server migrate:org-onboarding
 *   pnpm --filter server migrate:org-onboarding -- --prod
 *   pnpm --filter server migrate:org-onboarding -- --mongo-uri="mongodb+srv://..."
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Roles } from '@darnozom/shared-types';
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

async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log(`[migrate:org-onboarding] connecting (source=${mongoUriSource})`);

  const app = await NestFactory.createApplicationContext(MigrationModule);
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  const result = await userModel.updateMany({ roleName: Roles.SUPER_ADMIN }, { $set: { organizationOnboarded: true } });

  // eslint-disable-next-line no-console
  console.log(`[migrate:org-onboarding] matched=${result.matchedCount} modified=${result.modifiedCount}`);

  await app.close();
}

void bootstrap();
