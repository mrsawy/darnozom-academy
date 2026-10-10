import type { MongooseModuleOptions } from '@nestjs/mongoose';

/** Shared by the app, the seeder and the one-off migrations so they all connect the same way. */
export const MONGO_CONNECTION_OPTIONS: MongooseModuleOptions = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
};

export type TargetEnvironment = 'prod' | 'dev';

/**
 * Reads `--env=<prod|dev>` or `--env <prod|dev>` (as well as `--prod` / `--dev` shortcuts)
 * from CLI arguments.
 */
export function getCliEnvFlag(
  argv: string[] = typeof process !== 'undefined' && Array.isArray(process.argv) ? process.argv : []
): TargetEnvironment | undefined {
  if (!argv || argv.length === 0) return undefined;

  const hasProd = argv.includes('--prod');
  const hasDev = argv.includes('--dev');
  if (hasProd && hasDev) {
    throw new Error('Conflicting flags: cannot specify both --prod and --dev.');
  }
  if (hasProd) return 'prod';
  if (hasDev) return 'dev';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--env=')) {
      const rawVal = arg.slice('--env='.length).trim();
      return normalizeEnvTarget(rawVal);
    }
    if (arg === '--env') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('Missing value for --env flag. Expected "prod" or "dev" (e.g. --env prod, --env=prod).');
      }
      return normalizeEnvTarget(next.trim());
    }
  }

  return undefined;
}

function normalizeEnvTarget(raw: string): TargetEnvironment {
  const val = raw.toLowerCase();
  if (val === 'prod' || val === 'production' || val.endsWith('.production') || val === 'production.env') {
    return 'prod';
  }
  if (val === 'dev' || val === 'development' || val.endsWith('.development') || val === 'development.env' || val === '.env') {
    return 'dev';
  }
  throw new Error(`Invalid --env value "${raw}". Allowed values are "prod", "production", "dev", "development".`);
}

/**
 * Both databases are hosted on MongoDB Atlas (`lms` for production, `lms_client` for
 * development) — there is no local mongod fallback, so a missing URI has to fail loudly
 * rather than let a deployment start against the wrong database.
 *
 * `env` is explicit because `validateEnv` runs before ConfigModule copies the `.env` file
 * into `process.env`, so it must resolve against the config object it was handed.
 *
 * Target resolution order:
 * 1. Explicit `targetOverride` parameter ('prod' | 'dev')
 * 2. CLI flag `--env <prod|dev>` or `--env=<prod|dev>` (or `--prod` / `--dev`)
 * 3. `env.NODE_ENV === 'production'`
 */
export function getMongoUri(env: Record<string, unknown> = process.env, targetOverride?: TargetEnvironment): string {
  const cliTarget = targetOverride ?? getCliEnvFlag();
  const isProduction = cliTarget ? cliTarget === 'prod' : String(env.NODE_ENV ?? '').toLowerCase() === 'production';
  const variable = isProduction ? 'MONGODB_URI_PROD' : 'MONGODB_URI_DEV';
  const uri = env[variable];

  if (typeof uri !== 'string' || uri.length === 0) {
    throw new Error(
      `${variable} is not set. Provide the MongoDB Atlas connection string for the ${isProduction ? 'production' : 'development'} database.`
    );
  }

  return uri;
}
