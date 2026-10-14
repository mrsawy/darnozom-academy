/**
 * Billing announces a ledger change rather than calling academics directly. Readiness lives in
 * academics and the ledger lives here; a direct call each way would be a module cycle (plan
 * decision D3).
 */
export const BILLING_LEDGER_CHANGED_EVENT = 'billing.ledger.changed';

export interface BillingLedgerChangedPayload {
  organizationId: string;
  familyId: string;
  /** The groups whose readiness may have moved. Empty when the change touched no group. */
  groupIds: string[];
}
