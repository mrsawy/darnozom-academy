import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Currency, FamilyPaymentState } from '@darnozom/shared-types';
import { NotificationService } from 'src/notification/notification.service';
import { FamilyPayment } from '../entities/payment.entity';
import { LedgerService } from '../ledger/ledger.service';

interface FamilyPaymentLean {
  _id: unknown;
  organizationId: unknown;
  familyId: unknown;
  amountMinor: number;
  currency: Currency;
  status: FamilyPaymentState;
  payerId: unknown;
  gatewayPaymentId?: string | null;
}

@Injectable()
export class AcademyFeeWebhookService {
  constructor(
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationService
  ) {}

  /**
   * Confirms a gateway payment. Returns false when there was nothing to do.
   *
   * Providers retry webhooks, so this must be safe to call any number of times. The status guard on
   * the claim is the gate: whoever flips the row from not-confirmed to confirmed is the one caller
   * that goes on to post money, and every later delivery sees `modifiedCount: 0` and stops.
   */
  async onConfirmed(gatewayPaymentId: string): Promise<boolean> {
    const payment = await this.paymentModel.findOne({ gatewayPaymentId }).lean<FamilyPaymentLean | null>().exec();
    if (!payment) return false;
    if (payment.status === FamilyPaymentState.CONFIRMED) return false;

    const claim = await this.paymentModel
      .updateOne(
        { _id: payment._id, status: { $ne: FamilyPaymentState.CONFIRMED } },
        { $set: { status: FamilyPaymentState.CONFIRMED, reviewedAt: new Date() } }
      )
      .exec();
    if (claim.modifiedCount === 0) return false;

    await this.ledger.postPaymentAndAllocate({
      organizationId: String(payment.organizationId),
      familyId: String(payment.familyId),
      paymentId: String(payment._id),
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      createdBy: String(payment.payerId),
    });

    await this.notifications.create({
      userId: String(payment.familyId),
      titleKey: 'billingPaymentConfirmedTitle',
      bodyKey: 'billingPaymentConfirmedBody',
      data: { paymentId: String(payment._id) },
    });
    return true;
  }
}
