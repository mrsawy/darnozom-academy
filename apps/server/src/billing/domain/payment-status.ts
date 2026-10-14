import { Currency, FamilyPaymentStatus } from '@darnozom/shared-types';

export interface ChargeForStatus {
  amountMinor: number;
  allocatedMinor: number;
  dueAt: Date | null;
  currency: Currency;
}

export interface PaidInput {
  hasActiveSubscription: boolean;
  subscriptionAmountMinor: number;
  /** The start date of the cohort behind the group, so a charge due then already counts. */
  cohortStartDate: Date | null;
  charges: ChargeForStatus[];
  now: Date;
}

/**
 * A student counts as paid when they have an active subscription in the group and every charge of
 * theirs that is already due — or due at the cohort start — is fully covered.
 *
 * A charge due later than the cohort start is not yet the group's problem: a monthly subscription
 * would otherwise be permanently unpaid, and the group could never reach readiness.
 */
export function isStudentPaid(input: PaidInput): FamilyPaymentStatus {
  if (!input.hasActiveSubscription) return FamilyPaymentStatus.UNPAID;

  const relevant = input.charges.filter((charge) => {
    // A charge with no due date is treated as due now; a null must never be a way to defer money.
    if (charge.dueAt === null) return true;
    if (charge.dueAt.getTime() <= input.now.getTime()) return true;
    return input.cohortStartDate !== null && charge.dueAt.getTime() <= input.cohortStartDate.getTime();
  });

  const covered = relevant.every((charge) => charge.allocatedMinor >= charge.amountMinor);
  return covered ? FamilyPaymentStatus.PAID : FamilyPaymentStatus.UNPAID;
}
