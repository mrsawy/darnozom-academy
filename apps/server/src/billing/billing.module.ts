import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { Organization, OrganizationSchema } from '../organization/entities/organization.entity';
import { Group, GroupSchema } from '../academics/group/entities/group.entity';
import { Cohort, CohortSchema } from '../academics/cohort/entities/cohort.entity';
import { BillingSubscription, BillingSubscriptionSchema } from './entities/subscription.entity';
import { LedgerEntry, LedgerEntrySchema } from './entities/ledger-entry.entity';
import { FamilyPayment, FamilyPaymentSchema } from './entities/payment.entity';
import { Allocation, AllocationSchema } from './entities/allocation.entity';
import { FamilyService } from './family/family.service';
import { LedgerService } from './ledger/ledger.service';
import { SubscriptionService } from './subscription/subscription.service';
import { ReceiptUploadMethod } from './payment/methods/receipt-upload.method';
import { OnlineGatewayMethod } from './payment/methods/online-gateway.method';
import { AcademyFeeWebhookService } from './payment/academy-fee-webhook.service';
import { FamilyPaymentService } from './payment/family-payment.service';
import { FamilyPaymentMethodRegistry } from './payment/payment-method.registry';
import { FAMILY_PAYMENT_METHODS } from './payment/payment-method.interface';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Cohort.name, schema: CohortSchema },
      { name: BillingSubscription.name, schema: BillingSubscriptionSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: FamilyPayment.name, schema: FamilyPaymentSchema },
      { name: Allocation.name, schema: AllocationSchema },
    ]),
    forwardRef(() => PaymentModule),
    NotificationModule,
    FileModule,
  ],
  providers: [
    FamilyService,
    LedgerService,
    SubscriptionService,
    ReceiptUploadMethod,
    OnlineGatewayMethod,
    AcademyFeeWebhookService,
    FamilyPaymentService,
    FamilyPaymentMethodRegistry,
    {
      provide: FAMILY_PAYMENT_METHODS,
      useFactory: (receipt: ReceiptUploadMethod, gateway: OnlineGatewayMethod) => [receipt, gateway],
      inject: [ReceiptUploadMethod, OnlineGatewayMethod],
    },
  ],
  controllers: [],
  exports: [
    MongooseModule,
    FamilyService,
    LedgerService,
    SubscriptionService,
    FamilyPaymentMethodRegistry,
    ReceiptUploadMethod,
    OnlineGatewayMethod,
    AcademyFeeWebhookService,
    FamilyPaymentService,
  ],
})
export class BillingModule {}
