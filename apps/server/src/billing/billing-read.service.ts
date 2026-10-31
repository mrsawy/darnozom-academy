import { ForbiddenException, Injectable } from '@nestjs/common';
import { BillingErrors, Currency } from '@darnozom/shared-types';
import { outstandingOf } from './domain/allocation';
import { BillingActor, BillingSubscriptionLean, LedgerBalance, LedgerEntryLean } from './billing.types';
import { FamilyService } from './family/family.service';
import { LedgerService } from './ledger/ledger.service';
import { SubscriptionService } from './subscription/subscription.service';

export interface OpenSubscriptionBalance {
  subscriptionId: string;
  currency: Currency;
  outstandingMinor: number;
  chargeCount: number;
  studentIds: string[];
}

export interface FamilyStatementResponse {
  entries: LedgerEntryLean[];
  balances: LedgerBalance[];
  openSubscriptions: OpenSubscriptionBalance[];
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
    const [entries, balances, openCharges] = await Promise.all([
      this.ledger.statement(familyId),
      this.ledger.balances(familyId),
      this.ledger.openCharges(familyId),
    ]);

    const bySubscription = new Map<string, OpenSubscriptionBalance>();
    for (const charge of openCharges) {
      const outstandingMinor = outstandingOf(charge);
      if (outstandingMinor <= 0 || !charge.subscriptionId) continue;

      const existing = bySubscription.get(charge.subscriptionId);
      if (existing) {
        existing.outstandingMinor += outstandingMinor;
        existing.chargeCount += 1;
        if (charge.studentId && !existing.studentIds.includes(charge.studentId)) {
          existing.studentIds.push(charge.studentId);
        }
      } else {
        bySubscription.set(charge.subscriptionId, {
          subscriptionId: charge.subscriptionId,
          currency: charge.currency,
          outstandingMinor,
          chargeCount: 1,
          studentIds: charge.studentId ? [charge.studentId] : [],
        });
      }
    }

    return { entries, balances, openSubscriptions: [...bySubscription.values()] };
  }

  async subscriptionsFor(actor: BillingActor, familyId: string): Promise<BillingSubscriptionLean[]> {
    const canRead = await this.families.canActorReadFamily(actor, familyId);
    if (!canRead) {
      throw new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY);
    }
    return this.subscriptions.findForFamily(actor, familyId);
  }
}
