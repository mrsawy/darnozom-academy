import { Model, Types } from 'mongoose';
import { User } from '../entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { faker, fakerAR } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { Currency, Roles, UserStatus } from '@lms-organization/shared-types';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Type assertion for bcrypt to avoid unsafe member access errors
const bcryptTyped = bcrypt as { hash: (data: string, saltOrRounds: number) => Promise<string> };

// Helper function to hash passwords with proper typing
async function hashPassword(password: string): Promise<string> {
  return await bcryptTyped.hash(password, 10);
}

export class UserSeeder {
  constructor(
    private readonly userModel: Model<User>,
    private readonly walletModel: Model<Wallet>
  ) {}

  async seedUser(overrides: Partial<User> = {}, options: { arabicNames?: boolean } = {}) {
    const password = await hashPassword('password123');
    const userId = new Types.ObjectId();
    const walletId = new Types.ObjectId();

    const nf = options.arabicNames ? fakerAR : faker;

    const user = {
      _id: userId,
      username: faker.internet.username().toLowerCase(),
      email: faker.internet.email().toLowerCase(),
      phone: (() => {
        const raw = faker.phone.number();
        const parsed = parsePhoneNumberFromString(raw, 'EG') ?? parsePhoneNumberFromString(raw, 'US');
        return parsed ? (parsed.format('E.164') ?? raw) : raw;
      })(),
      password,
      firstName: nf.person.firstName(),
      lastName: nf.person.lastName(),
      roleName: Roles.STUDENT,
      status: UserStatus.ACTIVE,
      preferredCurrency: Currency.EGP,
      walletId,
      profile: {
        bio: nf.lorem.paragraph(),
        shortBio: nf.lorem.sentence(),
        // CloudFront has public/avatar/{1,3-9}.jpg; 0 and 2 return 403.
        avatar: `public/avatar/${[1, 3, 4, 5, 6, 7, 8, 9][Math.floor(Math.random() * 8)]}.jpg`,
        dateOfBirth: faker.date.birthdate(),
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          country: faker.location.country(),
        },
        socialLinks: {
          linkedin: `https://linkedin.com/in/${faker.internet.username()}`,
          twitter: `https://twitter.com/${faker.internet.username()}`,
        },
      },
      ...overrides,
    };

    const createdUser = await this.userModel.create(user);

    await this.walletModel.create({
      _id: walletId,
      userId: createdUser._id,
      organizationId: createdUser.organizationId ?? null,
      balance: faker.number.int({ min: 100, max: 1000 }),
      currency: createdUser.preferredCurrency || 'USD',
      isActive: true,
    });

    return createdUser;
  }

  async seedMultiple(count: number, overrides: Partial<User> = {}, options: { arabicNames?: boolean } = {}) {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.seedUser(overrides, options));
    }
    return users;
  }
}
