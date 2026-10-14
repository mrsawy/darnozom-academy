import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BILLING_LEDGER_CHANGED_EVENT, BillingLedgerChangedPayload } from 'src/billing/events/billing.events';
import { GroupStateService } from '../group/group-state.service';

@Injectable()
export class BillingLedgerListener {
  private readonly logger = new Logger(BillingLedgerListener.name);

  constructor(private readonly groupState: GroupStateService) {}

  /**
   * Money moved, so a group's PAYMENTS_MADE item may have changed. Re-evaluating readiness here is
   * what also closes the sub-project 3 pre-start task, since `syncReadiness` is the single hook
   * both features hang off.
   */
  @OnEvent(BILLING_LEDGER_CHANGED_EVENT)
  async onLedgerChanged(payload: BillingLedgerChangedPayload): Promise<void> {
    for (const groupId of payload.groupIds) {
      try {
        await this.groupState.syncReadiness(groupId);
      } catch (error) {
        // A readiness refresh that fails must never fail the payment that triggered it.
        this.logger.error(`Readiness refresh failed for group ${groupId}: ${(error as Error).message}`);
      }
    }
  }
}
