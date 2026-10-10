/**
 * Run every one-off migration under this folder, in a fixed order.
 *
 * Forwards DB targeting flags to each migration:
 *   --mongo-uri=... | --mongo ... | --prod
 *
 * Other per-migration flags (e.g. --dry-run) are also forwarded.
 *
 *   pnpm --filter server migrate:all
 *   pnpm --filter server migrate:all -- --prod
 *   pnpm --filter server migrate:all -- --mongo-uri="mongodb+srv://..."
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { hasArgFlag, resolveMigrationMongoUri } from './migration-mongo.util';

/**
 * Ordered list of migration entrypoints (basename under this directory).
 * Keep idempotent / safe-to-re-run scripts ahead of index changes where possible.
 */
const MIGRATION_FILES = [
  'approve-existing-organizations.ts',
  'set-organization-onboarded-existing-super-admins.ts',
  // Partial uniques before seed so soft-deleted grade name collisions cannot block upserts.
  'migrate-user-unique-if-not-deleted.ts',
  'migrate-enrollment-unique-if-not-deleted.ts',
  'migrate-grade-schooltype-unique-if-not-deleted.ts',
  'seed-grades.ts',
  'migrate-course-school-type-ids.ts',
  'migrate-private-session-instants.ts',
  'migrate-private-session-soft-delete.ts',
] as const;

function forwardArgs(): string[] {
  // Drop node/tsx script path; keep user flags only.
  return process.argv.slice(2);
}

function main() {
  // Fail fast on bad URI flags before spawning anything.
  const { source } = resolveMigrationMongoUri();
  // eslint-disable-next-line no-console
  console.log(`[migrate:all] starting ${MIGRATION_FILES.length} migrations (uri source=${source})`);

  if (hasArgFlag('--prod')) {
    // eslint-disable-next-line no-console
    console.log('[migrate:all] targeting PRODUCTION via --prod / MONGODB_URI_PROD');
  }

  // eslint-disable-next-line unicorn/prefer-module -- Nest/tsx migrations run as CommonJS (`module: commonjs`)
  const migrationsDir = __dirname;
  const serverRoot = path.resolve(migrationsDir, '../../..');
  const args = forwardArgs();

  for (const file of MIGRATION_FILES) {
    const scriptPath = path.resolve(migrationsDir, file);
    // eslint-disable-next-line no-console
    console.log(`\n[migrate:all] >>> ${file}`);

    const result = spawnSync('pnpm', ['exec', 'tsx', '-r', 'tsconfig-paths/register', scriptPath, ...args], {
      cwd: serverRoot,
      stdio: 'inherit',
      env: process.env,
      shell: true,
    });

    if (result.status !== 0) {
      // eslint-disable-next-line no-console
      console.error(`[migrate:all] FAILED at ${file} (exit=${result.status ?? 'null'})`);
      throw new Error(`[migrate:all] FAILED at ${file} (exit=${result.status ?? 'null'})`);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n[migrate:all] all migrations completed successfully');
}

main();
