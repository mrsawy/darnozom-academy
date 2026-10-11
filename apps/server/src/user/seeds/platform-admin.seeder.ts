import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Currency, Roles, UserStatus } from '@darnozom/shared-types';
import { User } from '../entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { PlatformAdminCredentials } from '../../database/seeds/prod-preflight';

const bcryptTyped = bcrypt as { hash: (data: string, saltOrRounds: number) => Promise<string> };

/**
 * Seeds the single platform admin account for a live deployment.
 *
 * Unlike {@link import('./user.seeder').UserSeeder} this writes no faker data and never
 * updates an existing account: if the email or username is already taken the run is a
 * no-op, so re-seeding a live database can never reset a rotated password.
 */
export class PlatformAdminSeeder {
  constructor(
    private readonly userModel: Model<User>,
    private readonly walletModel: Model<Wallet>
  ) {}

  async seed(credentials: PlatformAdminCredentials): Promise<{ created: boolean }> {
    const { email, username, password, phone, firstName, lastName } = credentials;

    // Matching either field prevents a duplicate-key crash when only one of the two collides.
    const existing = await this.userModel
      .findOne({ $or: [{ email }, { username }] })
      .lean()
      .exec();

    if (existing) return { created: false };

    const userId = new Types.ObjectId();
    const walletId = new Types.ObjectId();

    const createdUser = await this.userModel.create({
      _id: userId,
      username,
      email,
      phone,
      password: await bcryptTyped.hash(password, 10),
      firstName,
      lastName,
      roleName: Roles.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
      preferredCurrency: Currency.EGP,
      authProvider: 'local',
      onboardingComplete: true,
      walletId,
    });

    await this.walletModel.create({
      _id: walletId,
      userId: createdUser._id,
      organizationId: null,
      balance: 0,
      currency: Currency.EGP,
      isActive: true,
    });

    return { created: true };
  }
}
