import { Model, Types } from 'mongoose';
import { PaymentPurpose } from '@darnozom/shared-types';
import { AccessType } from '../../enrollment/enum/accessType.enum';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';

export class TransactionSeeder {
  constructor(
    private readonly transactionModel: Model<Transaction>,
    private readonly enrollmentModel: Model<Enrollment>
  ) {}

  /**
   * Creates completed course-purchase transactions for paid enrollments (reports / revenue charts).
   */
  async seedCoursePurchaseTransactionsForOrganization(organizationId: Types.ObjectId): Promise<void> {
    const paid = await this.enrollmentModel
      .find({
        organizationId,
        accessType: { $in: [AccessType.PAID_ONCE, AccessType.SUBSCRIPTION] },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .lean()
      .exec();

    for (const e of paid) {
      const billing = e.subscription?.billing;
      const amount = typeof billing?.amount === 'number' && !Number.isNaN(billing.amount) ? billing.amount : 0;
      if (amount <= 0) continue;

      const fees = Math.round(amount * 0.03 * 100) / 100;
      const netAmount = Math.round((amount - fees) * 100) / 100;
      const enrolledAt = e.enrolledAt ? new Date(e.enrolledAt) : new Date();
      const currency = typeof billing?.currency === 'string' ? billing.currency : 'EGP';

      await this.transactionModel.create({
        toOrganizationId: organizationId,
        userId: e.userId,
        purpose: PaymentPurpose.COURSE_PURCHASE,
        type: TransactionType.CREDIT,
        amount,
        currency,
        status: TransactionStatus.COMPLETED,
        balanceBefore: 0,
        balanceAfter: 0,
        fees,
        netAmount,
        courseId: e.courseId,
        enrollmentId: e._id,
        description: 'Seeded course purchase',
        metadata: {},
        processedAt: enrolledAt,
        createdAt: enrolledAt,
      });
    }
  }
}
