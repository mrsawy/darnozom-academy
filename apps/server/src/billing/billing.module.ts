import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingSubscription, BillingSubscriptionSchema } from './entities/subscription.entity';
import { LedgerEntry, LedgerEntrySchema } from './entities/ledger-entry.entity';
import { FamilyPayment, FamilyPaymentSchema } from './entities/payment.entity';
import { Allocation, AllocationSchema } from './entities/allocation.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillingSubscription.name, schema: BillingSubscriptionSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: FamilyPayment.name, schema: FamilyPaymentSchema },
      { name: Allocation.name, schema: AllocationSchema },
    ]),
  ],
  providers: [],
  controllers: [],
  exports: [MongooseModule],
})
export class BillingModule {}
