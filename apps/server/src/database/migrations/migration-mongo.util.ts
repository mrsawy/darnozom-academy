/**
 * Shared CLI helpers for one-off Mongo migrations under `src/database/migrations/`.
 *
 * URI resolution order:
 * 1. `--mongo-uri=<url>` or `--mongo <url>` (explicit connection string)
 * 2. `--prod` → `MONGODB_URI_PROD` from env / `.env`
 * 3. else `getMongoUri()` (`MONGODB_URI_PROD` when `NODE_ENV=production`, else `MONGODB_URI_DEV`)
 *
 * Examples:
 *   pnpm --filter server migrate:enrollment-unique-if-not-deleted -- --mongo-uri="mongodb+srv://..."
 *   pnpm --filter server migrate:all -- --prod
 *   pnpm --filter server migrate:all -- --mongo-uri="mongodb+srv://..."
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { getMongoUri } from '../../config/mongo.config';

/** apps/server/.env — load early so top-level URI resolution sees the vars. */
// eslint-disable-next-line unicorn/prefer-module -- Nest/tsx migrations run as CommonJS (`module: commonjs`)
loadDotenv({ path: path.resolve(__dirname, '../../../.env') });

/** Read `--flag=value` or `--flag value` from argv. */
export function getArgValue(...flags: string[]): string | undefined {
  for (const flag of flags) {
    const prefix = `${flag}=`;
    const eq = process.argv.find((arg) => arg.startsWith(prefix));
    if (eq) {
      const value = eq.slice(prefix.length).trim();
      if (value) return value;
    }
    const idx = process.argv.indexOf(flag);
    if (idx !== -1) {
      const next = process.argv[idx + 1];
      if (next && !next.startsWith('-')) return next.trim();
    }
  }
  return undefined;
}

export function hasArgFlag(...flags: string[]): boolean {
  return flags.some((flag) => process.argv.includes(flag) || process.argv.some((arg) => arg.startsWith(`${flag}=`)));
}

export type MigrationMongoUriSource = 'flag' | 'prod' | 'env';

/**
 * Prefer CLI `--mongo-uri` / `--mongo`, then `--prod` → `MONGODB_URI_PROD`,
 * otherwise fall back to env via `getMongoUri()`.
 */
export function resolveMigrationMongoUri(env: Record<string, unknown> = process.env): {
  uri: string;
  source: MigrationMongoUriSource;
} {
  const fromFlag = getArgValue('--mongo-uri', '--mongo');
  if (fromFlag) return { uri: fromFlag, source: 'flag' };

  if (hasArgFlag('--prod')) {
    const uri = env.MONGODB_URI_PROD;
    if (typeof uri !== 'string' || uri.length === 0) {
      throw new Error('MONGODB_URI_PROD is not set. Required when running migrations with --prod.');
    }
    return { uri, source: 'prod' };
  }

  return { uri: getMongoUri(env), source: 'env' };
}
