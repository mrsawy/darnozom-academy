import { getCliEnvFlag, getMongoUri } from './mongo.config';

describe('mongo.config', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe('getCliEnvFlag', () => {
    it('returns prod when --env=prod is present', () => {
      expect(getCliEnvFlag(['node', 'seed.ts', '--env=prod'])).toBe('prod');
    });

    it('returns prod when --env prod is present', () => {
      expect(getCliEnvFlag(['node', 'seed.ts', '--env', 'prod'])).toBe('prod');
    });

    it('returns dev when --env=dev is present', () => {
      expect(getCliEnvFlag(['node', 'seed.ts', '--env=dev'])).toBe('dev');
    });

    it('returns dev when --env dev is present', () => {
      expect(getCliEnvFlag(['node', 'seed.ts', '--env', 'dev'])).toBe('dev');
    });

    it('handles aliases: production and development', () => {
      expect(getCliEnvFlag(['node', 'seed.ts', '--env=production'])).toBe('prod');
      expect(getCliEnvFlag(['node', 'seed.ts', '--env', 'development'])).toBe('dev');
    });

    it('handles shortcuts --prod and --dev', () => {
      expect(getCliEnvFlag(['node', 'seed.ts', '--prod'])).toBe('prod');
      expect(getCliEnvFlag(['node', 'seed.ts', '--dev'])).toBe('dev');
    });

    it('throws when both --prod and --dev are provided', () => {
      expect(() => getCliEnvFlag(['node', 'seed.ts', '--prod', '--dev'])).toThrow(/Conflicting flags/);
    });

    it('throws when --env is passed without a value', () => {
      expect(() => getCliEnvFlag(['node', 'seed.ts', '--env'])).toThrow(/Missing value/);
      expect(() => getCliEnvFlag(['node', 'seed.ts', '--env', '--other-flag'])).toThrow(/Missing value/);
    });

    it('throws when an invalid --env value is provided', () => {
      expect(() => getCliEnvFlag(['node', 'seed.ts', '--env=staging'])).toThrow(/Invalid --env value/);
    });

    it('returns undefined when no env flag is present', () => {
      expect(getCliEnvFlag(['node', 'seed.ts'])).toBeUndefined();
    });
  });

  describe('getMongoUri', () => {
    const mockEnv = {
      MONGODB_URI_PROD: 'mongodb+srv://user:pass@cluster.mongodb.net/lms_prod',
      MONGODB_URI_DEV: 'mongodb+srv://user:pass@cluster.mongodb.net/lms_dev',
      NODE_ENV: 'development',
    };

    it('resolves MONGODB_URI_PROD when --env=prod is in process.argv, ignoring NODE_ENV=development', () => {
      process.argv = ['node', 'seed.ts', '--env=prod'];
      expect(getMongoUri(mockEnv)).toBe(mockEnv.MONGODB_URI_PROD);
    });

    it('resolves MONGODB_URI_DEV when --env=dev is in process.argv, ignoring NODE_ENV=production', () => {
      process.argv = ['node', 'seed.ts', '--env=dev'];
      expect(getMongoUri({ ...mockEnv, NODE_ENV: 'production' })).toBe(mockEnv.MONGODB_URI_DEV);
    });

    it('falls back to NODE_ENV when no CLI flag is set', () => {
      process.argv = ['node', 'seed.ts'];
      expect(getMongoUri({ ...mockEnv, NODE_ENV: 'production' })).toBe(mockEnv.MONGODB_URI_PROD);
      expect(getMongoUri({ ...mockEnv, NODE_ENV: 'development' })).toBe(mockEnv.MONGODB_URI_DEV);
    });

    it('accepts explicit targetOverride parameter', () => {
      process.argv = ['node', 'seed.ts', '--env=dev'];
      expect(getMongoUri(mockEnv, 'prod')).toBe(mockEnv.MONGODB_URI_PROD);
    });

    it('throws error when the required Mongo URI is missing', () => {
      process.argv = ['node', 'seed.ts', '--env=prod'];
      expect(() => getMongoUri({ NODE_ENV: 'development' })).toThrow(/MONGODB_URI_PROD is not set/);
    });
  });
});
