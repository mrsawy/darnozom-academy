import { Model, Types } from 'mongoose';
import { faker } from '@faker-js/faker';
import { WithdrawalRequest } from '../entities/withdrawal-request.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Currency, WithdrawalMethod, WithdrawalRequestStatus } from '@lms-organization/shared-types';
import { User } from '../../user/entities/user.entity';

const STATUSES = [
  WithdrawalRequestStatus.PENDING,
  WithdrawalRequestStatus.PENDING,
  WithdrawalRequestStatus.APPROVED,
  WithdrawalRequestStatus.APPROVED,
  WithdrawalRequestStatus.REJECTED,
  WithdrawalRequestStatus.CANCELLED,
];

export class WithdrawalRequestSeeder {
  constructor(
    private readonly withdrawalRequestModel: Model<WithdrawalRequest>,
    private readonly walletModel: Model<Wallet>
  ) {}

  async seedForInstructors(instructors: User[], adminId?: Types.ObjectId) {
    if (instructors.length === 0) return;

    for (const instructor of instructors) {
      const wallet = await this.walletModel.findOne({ userId: instructor._id }).lean();
      if (!wallet || wallet.balance <= 0) continue;

      const requestCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < requestCount; i++) {
        const amount = faker.number.float({ min: 50, max: Math.min(wallet.balance * 0.5, 500), fractionDigits: 2 });
        const status = faker.helpers.arrayElement(STATUSES);
        const method = faker.helpers.arrayElement([WithdrawalMethod.MOBILE_WALLET, WithdrawalMethod.BANK_TRANSFER, WithdrawalMethod.CREDIT_CARD]);

        const methodDetails =
          method === WithdrawalMethod.BANK_TRANSFER
            ? {
                iban: `EG${faker.string.numeric(27)}`,
                bankName: faker.company.name(),
                accountHolderName: `${instructor.firstName} ${instructor.lastName}`,
              }
            : method === WithdrawalMethod.MOBILE_WALLET
              ? {
                  phoneNumber: `+201${faker.string.numeric(9)}`,
                  providerName: faker.helpers.arrayElement(['Vodafone Cash', 'Orange Cash', 'Etisalat Cash']),
                }
              : { cardHolderName: `${instructor.firstName} ${instructor.lastName}`, cardLastFour: faker.string.numeric(4) };

        await this.withdrawalRequestModel.create({
          userId: instructor._id,
          walletId: wallet._id,
          amount,
          currency: Currency.EGP,
          method,
          methodDetails,
          status,
          userNote: faker.datatype.boolean({ probability: 0.4 }) ? faker.lorem.sentence() : undefined,
          ...(status === WithdrawalRequestStatus.APPROVED || status === WithdrawalRequestStatus.REJECTED
            ? {
                adminNote: faker.lorem.sentence(),
                processedBy: adminId,
                processedAt: new Date(Date.now() - faker.number.int({ min: 1, max: 7 }) * 86_400_000),
              }
            : {}),
        });
      }
    }
  }
}
