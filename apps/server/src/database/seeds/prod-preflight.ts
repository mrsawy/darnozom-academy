import { Currency } from '@lms-organization/shared-types';

/**
 * Checks that must pass before the production seed writes anything.
 *
 * Admin credentials and exchange rates are verified up front so failures abort before
 * (or, for rates, before plan writes) rather than being discovered halfway through.
 * `seed:prod` itself is upsert-only; `seed:prod:fresh` wipes collections first.
 */

/** Structural subset of CurrencyService; keeps the rate check testable without its network-fetching constructor. */
export interface ExchangeRateSource {
  updateExchangeRates(): Promise<void>;
  getExchangeRate(from: Currency, to: Currency): number;
}

export interface PlatformAdminCredentials {
  email: string;
  username: string;
  password: string;
  /** Required by UserSchema for local (non-Google) accounts with onboardingComplete. */
  phone: string;
  firstName: string;
  lastName: string;
}

const MINIMUM_PASSWORD_LENGTH = 12;

/**
 * A failed rate fetch leaves CurrencyService returning exactly 1, which would record
 * "500 EGP" as "$500". The real rate is ~48, so anything below this is treated as a failure.
 */
const MINIMUM_PLAUSIBLE_EGP_RATE = 2;

export function extractDatabaseName(uri: string): string {
  const database = new URL(uri).pathname.replace(/^\//, '');

  if (database.length === 0) {
    throw new Error(
      `The Mongo URI does not name a database (${redactUri(uri)}). Append the database name so the seed cannot write to the cluster default.`
    );
  }

  return decodeURIComponent(database);
}

/** Strips credentials so the resolved target can be printed to the console safely. */
export function redactUri(uri: string): string {
  const parsed = new URL(uri);
  if (parsed.password) parsed.password = '***';
  return parsed.toString();
}

/**
 * Plan prices are authored in EGP and converted to USD at seed time. CurrencyService
 * swallows fetch failures and falls back to a rate of 1, so the rate is verified before
 * a single plan is written.
 */
export async function assertExchangeRatesLoaded(rates: ExchangeRateSource): Promise<void> {
  await rates.updateExchangeRates();

  const usdToEgp = rates.getExchangeRate(Currency.USD, Currency.EGP);

  if (!Number.isFinite(usdToEgp) || usdToEgp < MINIMUM_PLAUSIBLE_EGP_RATE) {
    throw new Error(
      `Refusing to seed plans: the USD to EGP exchange rate is ${usdToEgp}, which means the rate API did not return usable data. ` +
        'Seeding now would store EGP amounts as USD prices. Check EXCHANGE_RATES_URL and network access, then re-run.'
    );
  }
}

export function readPlatformAdminCredentials(env: Record<string, string | undefined>): PlatformAdminCredentials {
  const required = ['PLATFORM_ADMIN_EMAIL', 'PLATFORM_ADMIN_USERNAME', 'PLATFORM_ADMIN_PASSWORD', 'PLATFORM_ADMIN_PHONE'] as const;
  const missing = required.filter((name) => !nonEmpty(env[name]));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s) for the platform admin: ${missing.join(', ')}`);
  }

  const password = env.PLATFORM_ADMIN_PASSWORD!;
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error(`PLATFORM_ADMIN_PASSWORD must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
  }

  return {
    email: env.PLATFORM_ADMIN_EMAIL!.trim().toLowerCase(),
    username: env.PLATFORM_ADMIN_USERNAME!.trim().toLowerCase(),
    password,
    phone: env.PLATFORM_ADMIN_PHONE!.trim(),
    firstName: nonEmpty(env.PLATFORM_ADMIN_FIRST_NAME) ?? 'Platform',
    lastName: nonEmpty(env.PLATFORM_ADMIN_LAST_NAME) ?? 'Admin',
  };
}

/** Treats a blank or whitespace-only variable as unset, so it falls back to the default. */
function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
