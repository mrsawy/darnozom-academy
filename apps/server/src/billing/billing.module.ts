import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { User, UserSchema } from '../user/entities/user.entity';
import { Organization, OrganizationSchema } from '../organization/entities/organization.entity';
import { Group, GroupSchema } from '../academics/group/entities/group.entity';
import { Cohort, CohortSchema } from '../academics/cohort/entities/cohort.entity';
import { Session, SessionSchema } from '../academics/session/entities/session.entity';
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
import { FamilyPaymentStatusService } from './status/family-payment-status.service';
import { FamilyPaymentMethodRegistry } from './payment/payment-method.registry';
import { FAMILY_PAYMENT_METHODS } from './payment/payment-method.interface';
import { MonthlyChargesService } from './jobs/monthly-charges.service';
import { SessionChargesService } from './jobs/session-charges.service';
import { RemindersService } from './jobs/reminders.service';
import { BillingProcessor } from './jobs/billing.processor';
import { BillingScheduler } from './jobs/billing.scheduler';
import { BILLING_QUEUE } from './jobs/billing.queue';
import { SessionCompletedBillingListener } from './events/session-completed.listener';
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
      { name: Session.name, schema: SessionSchema },
      { name: BillingSubscription.name, schema: BillingSubscriptionSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: FamilyPayment.name, schema: FamilyPaymentSchema },
      { name: Allocation.name, schema: AllocationSchema },
    ]),
    BullModule.registerQueue({ name: BILLING_QUEUE }),
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
    FamilyPaymentStatusService,
    FamilyPaymentMethodRegistry,
    MonthlyChargesService,
    SessionChargesService,
    RemindersService,
    BillingProcessor,
    BillingScheduler,
    SessionCompletedBillingListener,
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
    FamilyPaymentStatusService,
    MonthlyChargesService,
    SessionChargesService,
    RemindersService,
  ],
})
export class BillingModule {}
