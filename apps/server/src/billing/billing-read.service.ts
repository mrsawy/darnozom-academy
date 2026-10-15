import { ForbiddenException, Injectable } from '@nestjs/common';
import { BillingErrors } from '@darnozom/shared-types';
import { BillingActor, BillingSubscriptionLean, LedgerBalance, LedgerEntryLean } from './billing.types';
import { FamilyService } from './family/family.service';
import { LedgerService } from './ledger/ledger.service';
import { SubscriptionService } from './subscription/subscription.service';

export interface FamilyStatementResponse {
  entries: LedgerEntryLean[];
  balances: LedgerBalance[];
}

@Injectable()
export class BillingReadService {
  constructor(
    private readonly families: FamilyService,
    private readonly ledger: LedgerService,
    private readonly subscriptions: SubscriptionService
  ) {}

  async statementFor(actor: BillingActor, familyId: string): Promise<FamilyStatementResponse> {
    const canRead = await this.families.canActorReadFamily(actor, familyId);
    if (!canRead) {
      throw new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY);
    }
    const [entries, balances] = await Promise.all([this.ledger.statement(familyId), this.ledger.balances(familyId)]);
    return { entries, balances };
  }

  async subscriptionsFor(actor: BillingActor, familyId: string): Promise<BillingSubscriptionLean[]> {
    const canRead = await this.families.canActorReadFamily(actor, familyId);
    if (!canRead) {
      throw new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY);
    }
    return this.subscriptions.findForFamily(actor, familyId);
  }
}
