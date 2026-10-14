import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingErrors, FamilyPaymentState, PaymentProvider, PaymentPurpose, PAYMENT_METHOD_ONLINE_GATEWAY } from '@darnozom/shared-types';
import { Organization } from 'src/organization/entities/organization.entity';
import { PaymentOrchestratorService } from 'src/payment/services/payment-orchestrator.service';
import { User } from 'src/user/entities/user.entity';
import { toMajor } from '../../domain/money';
import { FamilyPayment } from '../../entities/payment.entity';
import { FamilyPaymentMethod, InitiateInput, InitiateResult, OrganizationForBilling } from '../payment-method.interface';

const oid = (id: string | Types.ObjectId) =>
  Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : (id as unknown as Types.ObjectId);

@Injectable()
export class OnlineGatewayMethod implements FamilyPaymentMethod {
  readonly key = PAYMENT_METHOD_ONLINE_GATEWAY;

  constructor(
    @InjectModel(FamilyPayment.name) private readonly paymentModel: Model<FamilyPayment>,
    @InjectModel(Organization.name) private readonly orgModel: Model<Organization>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly orchestrator: PaymentOrchestratorService
  ) {}

  /** Both conditions matter: switched on, and a provider actually configured behind it. */
  isEnabled(org: OrganizationForBilling): boolean {
    return Boolean(org.enabledFamilyPaymentMethods?.includes(this.key)) && Boolean(org.academyFeeGatewayProvider);
  }

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const org = await this.orgModel
      .findOne({ _id: oid(input.organizationId) })
      .lean<{ academyFeeGatewayProvider: PaymentProvider | null } | null>()
      .exec();
    const provider = org?.academyFeeGatewayProvider;
    if (!provider) throw new BadRequestException(BillingErrors.GATEWAY_NOT_CONFIGURED);

    const payer = await this.userModel.findOne({ _id: oid(input.payerId) }).exec();
    if (!payer) throw new BadRequestException(BillingErrors.NOT_YOUR_FAMILY);

    const payment = await this.paymentModel.create({
      organizationId: oid(input.organizationId),
      familyId: oid(input.familyId),
      method: this.key,
      amountMinor: input.amountMinor,
      currency: input.currency,
      // Not confirmed until the webhook says the money arrived.
      status: FamilyPaymentState.AWAITING_RECEIPT,
      receiptFileKey: null,
      gatewayPaymentId: null,
      payerId: oid(input.payerId),
    });

    const response = await this.orchestrator.createPaymentUrl({
      provider,
      // The orchestrator and every provider work in major units; minor units stop at this boundary.
      amount: toMajor(input.amountMinor, input.currency),
      currency: input.currency,
      user: payer as never,
      purpose: PaymentPurpose.ACADEMY_FEE,
      metadata: { familyPaymentId: String(payment._id), familyId: input.familyId },
    } as never);

    const gatewayPaymentId = (response as { paymentId?: string }).paymentId ?? null;
    if (gatewayPaymentId) {
      await this.paymentModel.updateOne({ _id: payment._id }, { $set: { gatewayPaymentId } }).exec();
    }

    return {
      kind: 'REDIRECT',
      url: (response as { paymentUrl: string }).paymentUrl,
      paymentId: String(payment._id),
    };
  }
}
