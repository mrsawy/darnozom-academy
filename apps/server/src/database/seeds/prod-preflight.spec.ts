import { Currency } from '@lms-organization/shared-types';
import { assertExchangeRatesLoaded, extractDatabaseName, readPlatformAdminCredentials, redactUri } from './prod-preflight';

const ATLAS_URI = 'mongodb+srv://seeder:s3cret@cluster0.abc.mongodb.net/lms?retryWrites=true&w=majority';
const STANDARD_URI = 'mongodb://seeder:s3cret@localhost:27017/lms_client?authSource=admin';

describe('extractDatabaseName', () => {
  it('reads the database from an Atlas SRV URI that carries query parameters', () => {
    expect(extractDatabaseName(ATLAS_URI)).toBe('lms');
  });

  it('reads the database from a standard mongodb:// URI', () => {
    expect(extractDatabaseName(STANDARD_URI)).toBe('lms_client');
  });

  it('rejects a URI with no database path so the seed cannot write to the cluster default', () => {
    expect(() => extractDatabaseName('mongodb+srv://seeder:s3cret@cluster0.abc.mongodb.net/?retryWrites=true')).toThrow(/database name/i);
  });
});

describe('redactUri', () => {
  it('removes the password so the target can be logged safely', () => {
    const redacted = redactUri(ATLAS_URI);

    expect(redacted).not.toContain('s3cret');
    expect(redacted).toContain('cluster0.abc.mongodb.net');
    expect(redacted).toContain('lms');
  });
});

/** Stands in for CurrencyService, whose constructor fetches over the network and starts a timer. */
function rateSource(egpRate: number) {
  let refreshed = false;
  return {
    updateExchangeRates: () => {
      refreshed = true;
      return Promise.resolve();
    },
    getExchangeRate: (from: Currency, to: Currency) => (from === Currency.USD && to === Currency.EGP ? egpRate : 1),
    wasRefreshed: () => refreshed,
  };
}

describe('assertExchangeRatesLoaded', () => {
  it('refreshes the rates before inspecting them', async () => {
    const source = rateSource(48.5);

    await assertExchangeRatesLoaded(source);

    expect(source.wasRefreshed()).toBe(true);
  });

  it('passes when a realistic USD to EGP rate is loaded', async () => {
    await expect(assertExchangeRatesLoaded(rateSource(48.5))).resolves.toBeUndefined();
  });

  it('rejects the 1.0 fallback that CurrencyService returns when the rate API fails', async () => {
    await expect(assertExchangeRatesLoaded(rateSource(1))).rejects.toThrow(/exchange rate/i);
  });

  it('rejects a non-finite rate', async () => {
    await expect(assertExchangeRatesLoaded(rateSource(Number.NaN))).rejects.toThrow(/exchange rate/i);
  });
});

describe('readPlatformAdminCredentials', () => {
  const validEnv = {
    PLATFORM_ADMIN_EMAIL: 'Admin@LMS-Platform.com',
    PLATFORM_ADMIN_USERNAME: 'Platform-Admin',
    PLATFORM_ADMIN_PASSWORD: 'a-long-enough-secret',
    PLATFORM_ADMIN_PHONE: '+201000000000',
  };

  it('reads the credentials from the environment', () => {
    expect(readPlatformAdminCredentials(validEnv)).toMatchObject({
      email: 'admin@lms-platform.com',
      username: 'platform-admin',
      password: 'a-long-enough-secret',
      phone: '+201000000000',
    });
  });

  it('lowercases email and username so the existence check matches what the schema stores', () => {
    const credentials = readPlatformAdminCredentials(validEnv);

    expect(credentials.email).toBe('admin@lms-platform.com');
    expect(credentials.username).toBe('platform-admin');
  });

  it('defaults the display name when it is not configured', () => {
    expect(readPlatformAdminCredentials(validEnv)).toMatchObject({ firstName: 'Platform', lastName: 'Admin' });
  });

  it('uses a configured display name', () => {
    const credentials = readPlatformAdminCredentials({ ...validEnv, PLATFORM_ADMIN_FIRST_NAME: 'Ahmed', PLATFORM_ADMIN_LAST_NAME: 'Mrsawy' });

    expect(credentials).toMatchObject({ firstName: 'Ahmed', lastName: 'Mrsawy' });
  });

  it('names every missing variable at once instead of failing one at a time', () => {
    let message = '';
    try {
      readPlatformAdminCredentials({});
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('PLATFORM_ADMIN_EMAIL');
    expect(message).toContain('PLATFORM_ADMIN_USERNAME');
    expect(message).toContain('PLATFORM_ADMIN_PASSWORD');
    expect(message).toContain('PLATFORM_ADMIN_PHONE');
  });

  it('rejects a password too short to protect a production platform admin', () => {
    expect(() => readPlatformAdminCredentials({ ...validEnv, PLATFORM_ADMIN_PASSWORD: 'tiny-pw' })).toThrow(/12 characters/);
  });

  it('does not echo the rejected password in the error', () => {
    expect(() => readPlatformAdminCredentials({ ...validEnv, PLATFORM_ADMIN_PASSWORD: 'tiny-pw' })).not.toThrow(/tiny-pw/);
  });
});
