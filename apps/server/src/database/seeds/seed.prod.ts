/**
 * Production seed — platform bootstrap data only.
 *
 * Seeds the reference data a live deployment cannot function without: roles and their
 * permissions, subscription plans, AI plans, grades, school types, and the platform admin
 * account. It deliberately seeds no organizations, users, courses or any other tenant data —
 * that is the dev seed's job (`pnpm seed`).
 *
 * `pnpm seed:prod` — idempotent upserts only (safe to re-run).
 * `pnpm seed:prod:fresh` — wipes every collection first, then seeds.
 *
 * Preconditions (exchange rates, admin credentials) are checked before the first write —
 * see `prod-preflight.ts`.
 *
 *   pnpm seed:prod --env prod
 *   pnpm seed:prod --env dev
 *   pnpm seed:prod:fresh --env prod
 *   NODE_ENV=production pnpm seed:prod
 *   NODE_ENV=production pnpm seed:prod:fresh
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Connection, ConnectionStates, Model } from 'mongoose';
import { configDotenv } from 'dotenv';
import path from 'node:path';

import { getMongoUri, getCliEnvFlag, MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { Role, RoleSchema } from '../../role/entities/role.entity';
import { Plan, PlanSchema } from '../../plan/entities/plan.entity';
import { AiPlan, AiPlanSchema } from '../../ai-plan/entities/ai-plan.entity';
import { Grade, GradeSchema } from '../../grade/entities/grade.entity';
import { SchoolType, SchoolTypeSchema } from '../../school-type/entities/school-type.entity';
import { User, UserSchema } from '../../user/entities/user.entity';
import { Wallet, WalletSchema } from '../../wallet/entities/wallet.entity';

import { CurrencyService } from '../../currency/currency.service';
import { RoleSeeder } from '../../role/seeds/role.seeder';
import { GradeSeeder } from '../../grade/seeds/grade.seeder';
import { SchoolTypeSeeder } from '../../school-type/seeds/school-type.seeder';
import { PlanSeeder } from '../../plan/seeds/plan.seeder';
import { AiPlanSeeder } from '../../ai-plan/seeds/ai-plan.seeder';
import { PlatformAdminSeeder } from '../../user/seeds/platform-admin.seeder';
import { ROLE_SEED_DEFINITIONS } from '../../role/seeds/roles.config';
import { GRADE_SEED_DEFINITIONS } from '../../grade/seeds/grade.config';
import { SCHOOL_TYPE_SEED_DEFINITIONS } from '../../school-type/seeds/school-type.config';

import { assertExchangeRatesLoaded, extractDatabaseName, readPlatformAdminCredentials, redactUri } from './prod-preflight';

// Ensure apps/server/.env is loaded before reading flags and DB config
// eslint-disable-next-line unicorn/prefer-module -- Nest CommonJS build; __dirname locates apps/server/.env
configDotenv({ path: path.resolve(__dirname, '../../../.env') });
configDotenv();

const targetEnv = getCliEnvFlag();
if (targetEnv === 'prod') {
  process.env.NODE_ENV = 'production';
} else if (targetEnv === 'dev') {
  process.env.NODE_ENV = 'development';
}

const log = (msg: string) => console.log(msg); // eslint-disable-line no-console

const isFresh = process.argv.includes('--fresh');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(getMongoUri(), MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: AiPlan.name, schema: AiPlanSchema },
      { name: Grade.name, schema: GradeSchema },
      { name: SchoolType.name, schema: SchoolTypeSchema },
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
  ],
  providers: [CurrencyService],
})
class ProductionSeedModule {}

/** Clears every non-system collection on the connected database (not only registered models). */
async function wipeAllCollections(connection: Connection): Promise<void> {
  const db = connection.db;
  if (!db) {
    throw new Error('MongoDB connection has no database handle — cannot wipe.');
  }

  const collections = await db.listCollections().toArray();
  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    await db.collection(name).deleteMany({});
  }
}

async function bootstrap() {
  process.env.DISABLE_REALTIME = 'true';

  // ─── Preflight: fail before connecting, not halfway through ─────
  const uri = getMongoUri();
  const database = extractDatabaseName(uri);
  const adminCredentials = readPlatformAdminCredentials(process.env);

  const effectiveEnv = targetEnv ?? (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

  log(`Production seed${isFresh ? ' (fresh)' : ''} [${effectiveEnv}] — target database: ${database}`);
  log(`  ${redactUri(uri)}`);

  const app = await NestFactory.createApplicationContext(ProductionSeedModule);

  const connection = app.get<Connection>(getConnectionToken());
  if (connection.readyState !== ConnectionStates.connected) {
    log('Waiting for MongoDB connection...');
    await Promise.race([
      new Promise<void>((resolve) => connection.once('connected', () => resolve())),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('MongoDB connection timeout after 15s')), 15_000)),
    ]);
  }

  if (isFresh) {
    log('Wiping all collections...');
    await wipeAllCollections(connection);
    log('Database wiped.');
  }

  const roleModel = app.get<Model<Role>>(getModelToken(Role.name));
  const planModel = app.get<Model<Plan>>(getModelToken(Plan.name));
  const aiPlanModel = app.get<Model<AiPlan>>(getModelToken(AiPlan.name));
  const gradeModel = app.get<Model<Grade>>(getModelToken(Grade.name));
  const schoolTypeModel = app.get<Model<SchoolType>>(getModelToken(SchoolType.name));
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const walletModel = app.get<Model<Wallet>>(getModelToken(Wallet.name));
  const currencyService = app.get(CurrencyService);

  // ─── Roles, grades, school types ────────────────────────────────
  log(`Seeding Roles (${ROLE_SEED_DEFINITIONS.length})...`);
  await new RoleSeeder(roleModel).seed();

  log(`Seeding Grades (${GRADE_SEED_DEFINITIONS.length})...`);
  await new GradeSeeder(gradeModel).seed();

  log(`Seeding School Types (${SCHOOL_TYPE_SEED_DEFINITIONS.length})...`);
  await new SchoolTypeSeeder(schoolTypeModel).seed();

  // ─── Plans (guarded: prices are converted from EGP at seed time) ─
  log('Verifying exchange rates before writing plan prices...');
  await assertExchangeRatesLoaded(currencyService);

  log('Seeding Plans...');
  await new PlanSeeder(planModel, currencyService).seed();

  log('Seeding AI Plans...');
  await new AiPlanSeeder(aiPlanModel).seed();

  // ─── Platform admin ─────────────────────────────────────────────
  log('Seeding Platform Admin...');
  const { created } = await new PlatformAdminSeeder(userModel, walletModel).seed(adminCredentials);
  log(
    created ? `  Created platform admin ${adminCredentials.email}` : `  Platform admin already exists (${adminCredentials.email}) — left untouched`
  );

  log(`\nProduction seed complete on "${database}".`);
  await app.close();
  // eslint-disable-next-line unicorn/no-process-exit, n/no-process-exit
  process.exit(0);
}

bootstrap().catch((error: unknown) => {
  console.error(`\nProduction seed aborted:\n${error instanceof Error ? error.message : String(error)}`); // eslint-disable-line no-console
  // eslint-disable-next-line unicorn/no-process-exit, n/no-process-exit
  process.exit(1);
});
