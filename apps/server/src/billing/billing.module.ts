import { Module } from '@nestjs/common';
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
import { FamilyPaymentMethodRegistry } from './payment/payment-method.registry';
import { FAMILY_PAYMENT_METHODS } from './payment/payment-method.interface';

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
  ],
  providers: [
    FamilyService,
    LedgerService,
    SubscriptionService,
    ReceiptUploadMethod,
    FamilyPaymentMethodRegistry,
    {
      provide: FAMILY_PAYMENT_METHODS,
      useFactory: (receipt: ReceiptUploadMethod) => [receipt],
      inject: [ReceiptUploadMethod],
    },
  ],
  controllers: [],
  exports: [MongooseModule, FamilyService, LedgerService, SubscriptionService, FamilyPaymentMethodRegistry, ReceiptUploadMethod],
})
export class BillingModule {}
