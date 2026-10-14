import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { BillingSubscription, BillingSubscriptionSchema } from './entities/subscription.entity';
import { LedgerEntry, LedgerEntrySchema } from './entities/ledger-entry.entity';
import { FamilyPayment, FamilyPaymentSchema } from './entities/payment.entity';
import { Allocation, AllocationSchema } from './entities/allocation.entity';
import { FamilyService } from './family/family.service';
import { LedgerService } from './ledger/ledger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BillingSubscription.name, schema: BillingSubscriptionSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: FamilyPayment.name, schema: FamilyPaymentSchema },
      { name: Allocation.name, schema: AllocationSchema },
    ]),
  ],
  providers: [FamilyService, LedgerService],
  controllers: [],
  exports: [MongooseModule, FamilyService, LedgerService],
})
export class BillingModule {}
