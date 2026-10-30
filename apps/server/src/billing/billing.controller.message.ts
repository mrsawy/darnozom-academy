import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../academics/common/actor';
import { BillingReadService } from './billing-read.service';
import {
  AttachReceiptPayload,
  CreateAdjustmentPayload,
  CreateCustomPaymentMethodConfigPayload,
  CreateSubscriptionPayload,
  FamilyIdPayload,
  GroupIdPayload,
  InitiatePaymentPayload,
  ListFamilyPaymentsPayload,
  RejectPaymentPayload,
  ReviewPaymentPayload,
  ReviewQueueFilterPayload,
  SetPaymentMethodConfigEnabledPayload,
  SubscriptionIdPayload,
  UpdateBillingSettingsPayload,
  UpsertPaymentMethodConfigFieldsPayload,
} from './dto/billing.dto';
import { LedgerService } from './ledger/ledger.service';
import { FamilyPaymentService } from './payment/family-payment.service';
import { SubscriptionService } from './subscription/subscription.service';
import { BillingSettingsService } from './settings/billing-settings.service';
import { PaymentMethodConfigService } from './payment-method-config/payment-method-config.service';

@Controller()
@ApplyRpcErrorHandling
export class BillingControllerMessage {
  constructor(
    private readonly subscriptions: SubscriptionService,
    private readonly ledger: LedgerService,
    private readonly familyPayments: FamilyPaymentService,
    private readonly billingRead: BillingReadService,
    private readonly billingSettings: BillingSettingsService,
    private readonly paymentMethodConfigs: PaymentMethodConfigService
  ) {}

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.subscriptions.create')
  createSubscription(@Payload(new RpcValidationPipe()) payload: CreateSubscriptionPayload, @Ctx() context: IUserContext) {
    return this.subscriptions.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.BILLING })
  @MessagePattern('billing.subscriptions.listForGroup')
  listSubscriptionsForGroup(@Payload(new RpcValidationPipe()) payload: GroupIdPayload, @Ctx() context: IUserContext) {
    return this.subscriptions.findForGroup(actorFromContext(context), payload.groupId);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.BILLING })
  @MessagePattern('billing.subscriptions.listForFamily')
  listSubscriptionsForFamily(@Payload(new RpcValidationPipe()) payload: FamilyIdPayload, @Ctx() context: IUserContext) {
    return this.billingRead.subscriptionsFor(actorFromContext(context), payload.familyId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.subscriptions.end')
  endSubscription(@Payload(new RpcValidationPipe()) payload: SubscriptionIdPayload, @Ctx() context: IUserContext) {
    return this.subscriptions.end(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.BILLING })
  @MessagePattern('billing.ledger.statement')
  statement(@Payload(new RpcValidationPipe()) payload: FamilyIdPayload, @Ctx() context: IUserContext) {
    return this.billingRead.statementFor(actorFromContext(context), payload.familyId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.ledger.adjust')
  adjust(@Payload(new RpcValidationPipe()) payload: CreateAdjustmentPayload, @Ctx() context: IUserContext) {
    const actor = actorFromContext(context);
    return this.ledger.postAdjustment({
      ...payload,
      organizationId: actor.organizationId,
      createdBy: actor._id,
    });
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.FAMILY_PAYMENT })
  @MessagePattern('billing.payments.methods')
  listPaymentMethods(@Ctx() context: IUserContext) {
    return this.familyPayments.listMethods(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.payments.methods.all')
  listAllPaymentMethods() {
    return this.familyPayments.listAllMethods();
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.FAMILY_PAYMENT })
  @MessagePattern('billing.payments.initiate')
  initiatePayment(@Payload(new RpcValidationPipe()) payload: InitiatePaymentPayload, @Ctx() context: IUserContext) {
    return this.familyPayments.initiate(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.FAMILY_PAYMENT })
  @MessagePattern('billing.payments.attachReceipt')
  attachReceipt(@Payload(new RpcValidationPipe()) payload: AttachReceiptPayload, @Ctx() context: IUserContext) {
    return this.familyPayments.attachReceipt(actorFromContext(context), payload.paymentId, payload.fileKey);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.FAMILY_PAYMENT })
  @MessagePattern('billing.payments.queue')
  reviewQueue(@Payload(new RpcValidationPipe()) payload: ReviewQueueFilterPayload, @Ctx() context: IUserContext) {
    return this.familyPayments.reviewQueue(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.FAMILY_PAYMENT })
  @MessagePattern('billing.payments.approve')
  approvePayment(@Payload(new RpcValidationPipe()) payload: ReviewPaymentPayload, @Ctx() context: IUserContext) {
    return this.familyPayments.approve(actorFromContext(context), payload.paymentId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.FAMILY_PAYMENT })
  @MessagePattern('billing.payments.reject')
  rejectPayment(@Payload(new RpcValidationPipe()) payload: RejectPaymentPayload, @Ctx() context: IUserContext) {
    return this.familyPayments.reject(actorFromContext(context), payload.paymentId, payload.reason);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.BILLING })
  @MessagePattern('billing.settings.get')
  getSettings(@Ctx() context: IUserContext) {
    return this.billingSettings.get(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.settings.update')
  updateSettings(@Payload(new RpcValidationPipe()) payload: UpdateBillingSettingsPayload, @Ctx() context: IUserContext) {
    return this.billingSettings.update(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.BILLING })
  @MessagePattern('billing.paymentMethodConfigs.list')
  listPaymentMethodConfigs(@Ctx() context: IUserContext) {
    return this.paymentMethodConfigs.listForOrg(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.paymentMethodConfigs.upsertFields')
  upsertPaymentMethodConfigFields(@Payload(new RpcValidationPipe()) payload: UpsertPaymentMethodConfigFieldsPayload, @Ctx() context: IUserContext) {
    return this.paymentMethodConfigs.upsertFields(actorFromContext(context), payload.configId, payload.fields);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.paymentMethodConfigs.setEnabled')
  setPaymentMethodConfigEnabled(@Payload(new RpcValidationPipe()) payload: SetPaymentMethodConfigEnabledPayload, @Ctx() context: IUserContext) {
    return this.paymentMethodConfigs.setEnabled(actorFromContext(context), payload.configId, payload.enabled);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.BILLING })
  @MessagePattern('billing.paymentMethodConfigs.createCustom')
  createCustomPaymentMethodConfig(@Payload(new RpcValidationPipe()) payload: CreateCustomPaymentMethodConfigPayload, @Ctx() context: IUserContext) {
    return this.paymentMethodConfigs.createCustom(actorFromContext(context), payload.label, payload.fields);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.FAMILY_PAYMENT })
  @MessagePattern('billing.payments.myFamily')
  listFamilyPayments(@Payload(new RpcValidationPipe()) payload: ListFamilyPaymentsPayload, @Ctx() context: IUserContext) {
    return this.familyPayments.listForFamily(actorFromContext(context), payload.familyId);
  }
}
