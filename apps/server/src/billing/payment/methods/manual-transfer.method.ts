import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingErrors, FamilyPaymentState, PAYMENT_METHOD_MANUAL_TRANSFER } from '@darnozom/shared-types';
import { FamilyPayment } from '../../entities/payment.entity';
import { PaymentMethodConfigService } from '../../payment-method-config/payment-method-config.service';
import { FamilyPaymentMethod, InitiateInput, InitiateResult, OrganizationForBilling } from '../payment-method.interface';

const oid = (id: string | Types.ObjectId) => (Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId));

@Injectable()
export class ManualTransferMethod implements FamilyPaymentMethod {
  readonly key = PAYMENT_METHOD_MANUAL_TRANSFER;

  constructor(
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>,
    private readonly configs: PaymentMethodConfigService
  ) {}

  isEnabled(org: OrganizationForBilling): boolean {
    return Boolean(org.enabledFamilyPaymentMethods?.includes(this.key));
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const configId = (input.meta?.paymentMethodConfigId as string | undefined)?.trim();
    if (!configId) throw new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND);
    const subscriptionId = (input.meta?.subscriptionId as string | undefined)?.trim() || null;

    let config;
    try {
      config = await this.configs.get(
        { _id: input.payerId, organizationId: input.organizationId } as never,
        configId
      );
    } catch {
      throw new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND);
    }
    if (!config.enabled) throw new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_DISABLED);

    const payment = await this.paymentModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      method: this.key,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: FamilyPaymentState.AWAITING_RECEIPT,
      receiptFileKey: null,
      gatewayPaymentId: null,
      payerId: oid(input.payerId),
      paymentMethodConfigId: oid(config._id),
      methodSnapshot: { label: config.label, fields: config.fields },
      subscriptionId: subscriptionId ? oid(subscriptionId) : null,
    });

    return { kind: 'AWAIT_RECEIPT', paymentId: String(payment._id) };
  }
}
