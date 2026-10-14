import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FamilyPaymentState, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { FamilyPayment } from '../../entities/payment.entity';
import { FamilyPaymentMethod, InitiateInput, InitiateResult, OrganizationForBilling } from '../payment-method.interface';

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

@Injectable()
export class ReceiptUploadMethod implements FamilyPaymentMethod {
  readonly key = PAYMENT_METHOD_RECEIPT_UPLOAD;

  constructor(@InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>) {}

  /**
   * Enabled unless the organization has explicitly configured a list without it. Receipt upload is
   * the fallback every academy can use without integrating anything, so an unconfigured
   * organization must not be left with no way for a parent to pay.
   */
  isEnabled(org: OrganizationForBilling): boolean {
    const enabled = org.enabledFamilyPaymentMethods;
    return !Array.isArray(enabled) || enabled.length === 0 || enabled.includes(this.key);
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const payment = await this.paymentModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      method: this.key,
      amountMinor: input.amountMinor,
      currency: input.currency,
      // Nothing is money yet: no ledger entry exists until an accountant approves the receipt.
      status: FamilyPaymentState.AWAITING_RECEIPT,
      receiptFileKey: null,
      gatewayPaymentId: null,
      payerId: oid(input.payerId),
    });
    return { kind: 'AWAIT_RECEIPT', paymentId: String(payment._id) };
  }
}
