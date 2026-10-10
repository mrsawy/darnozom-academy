import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Roles, UserStatus } from '@lms-organization/shared-types';
import { User } from '../entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { PlatformAdminSeeder } from './platform-admin.seeder';

const CREDENTIALS = {
  email: 'admin@lms-platform.com',
  username: 'platform-admin',
  password: 'a-long-enough-secret',
  phone: '+201000000000',
  firstName: 'Platform',
  lastName: 'Admin',
};

type SeedDoc = Record<string, unknown>;

/** Mirrors the `findOne(...).lean().exec()` chain the seeder uses. */
const findOneResolving = (result: SeedDoc | null) => ({ lean: () => ({ exec: () => Promise.resolve(result) }) });

describe('PlatformAdminSeeder', () => {
  const findOne = jest.fn<ReturnType<typeof findOneResolving>, [SeedDoc]>();
  const createUser = jest.fn<Promise<SeedDoc>, [SeedDoc]>();
  const createWallet = jest.fn<Promise<SeedDoc>, [SeedDoc]>();

  const userModel = { findOne, create: createUser } as unknown as Model<User>;
  const walletModel = { create: createWallet } as unknown as Model<Wallet>;

  const createdUserDoc = () => createUser.mock.calls[0][0];

  let seeder: PlatformAdminSeeder;

  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockReturnValue(findOneResolving(null));
    createUser.mockImplementation((doc) => Promise.resolve(doc));
    createWallet.mockImplementation((doc) => Promise.resolve(doc));
    seeder = new PlatformAdminSeeder(userModel, walletModel);
  });

  describe('when no matching account exists', () => {
    it('reports that it created the account', async () => {
      await expect(seeder.seed(CREDENTIALS)).resolves.toEqual({ created: true });
    });

    it('creates the account with the platform admin role and an active status', async () => {
      await seeder.seed(CREDENTIALS);

      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: CREDENTIALS.email,
          username: CREDENTIALS.username,
          phone: CREDENTIALS.phone,
          firstName: 'Platform',
          lastName: 'Admin',
          roleName: Roles.PLATFORM_ADMIN,
          status: UserStatus.ACTIVE,
        })
      );
    });

    it('stores a bcrypt hash rather than the plaintext password', async () => {
      await seeder.seed(CREDENTIALS);

      const storedPassword = createdUserDoc().password as string;
      expect(storedPassword).not.toBe(CREDENTIALS.password);
      await expect(bcrypt.compare(CREDENTIALS.password, storedPassword)).resolves.toBe(true);
    });

    it('does not attach the account to an organization', async () => {
      await seeder.seed(CREDENTIALS);

      expect(createdUserDoc().organizationId).toBeUndefined();
    });

    it('creates an empty wallet linked to the new account', async () => {
      await seeder.seed(CREDENTIALS);

      const created = createdUserDoc();
      expect(createWallet).toHaveBeenCalledWith(expect.objectContaining({ _id: created.walletId, userId: created._id, balance: 0 }));
    });

    it('looks the account up by email or username so a partial collision is caught', async () => {
      await seeder.seed(CREDENTIALS);

      expect(findOne).toHaveBeenCalledWith({ $or: [{ email: CREDENTIALS.email }, { username: CREDENTIALS.username }] });
    });
  });

  describe('when an account already exists', () => {
    it('leaves an account matched by email untouched', async () => {
      findOne.mockReturnValue(findOneResolving({ email: CREDENTIALS.email, username: 'someone-else' }));

      await expect(seeder.seed(CREDENTIALS)).resolves.toEqual({ created: false });
      expect(createUser).not.toHaveBeenCalled();
      expect(createWallet).not.toHaveBeenCalled();
    });

    it('leaves an account matched only by username untouched', async () => {
      findOne.mockReturnValue(findOneResolving({ email: 'other@example.com', username: CREDENTIALS.username }));

      await expect(seeder.seed(CREDENTIALS)).resolves.toEqual({ created: false });
      expect(createUser).not.toHaveBeenCalled();
    });

    it('does not create a second account when run twice', async () => {
      await seeder.seed(CREDENTIALS);
      findOne.mockReturnValue(findOneResolving({ email: CREDENTIALS.email, username: CREDENTIALS.username }));

      await seeder.seed(CREDENTIALS);

      expect(createUser).toHaveBeenCalledTimes(1);
    });
  });
});
