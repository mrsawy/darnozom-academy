import { Currency, FamilyPaymentStatus } from '@darnozom/shared-types';
import { isStudentPaid, PaidInput } from './payment-status';

const NOW = new Date('2026-03-20T00:00:00.000Z');
const DUE_PAST = new Date('2026-03-01T00:00:00.000Z');
const DUE_FUTURE = new Date('2026-06-01T00:00:00.000Z');
const COHORT_START = new Date('2026-04-01T00:00:00.000Z');

const input = (overrides: Partial<PaidInput> = {}): PaidInput => ({
  hasActiveSubscription: true,
  subscriptionAmountMinor: 50_000,
  cohortStartDate: COHORT_START,
  charges: [{ amountMinor: 10_000, allocatedMinor: 10_000, dueAt: DUE_PAST, currency: Currency.EGP }],
  now: NOW,
  ...overrides,
});

describe('isStudentPaid', () => {
  it('is unpaid without an active subscription, whatever the ledger says', () => {
    expect(isStudentPaid(input({ hasActiveSubscription: false, charges: [] }))).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('is paid when every due charge is fully covered', () => {
    expect(isStudentPaid(input())).toBe(FamilyPaymentStatus.PAID);
  });

  it('is unpaid when a due charge is only partly covered', () => {
    expect(
      isStudentPaid(
        input({
          charges: [{ amountMinor: 10_000, allocatedMinor: 4000, dueAt: DUE_PAST, currency: Currency.EGP }],
        })
      )
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('is unpaid when a due charge is not covered at all', () => {
    expect(
      isStudentPaid(
        input({
          charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: DUE_PAST, currency: Currency.EGP }],
        })
      )
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('ignores a charge that is not due yet and does not fall at the cohort start', () => {
    expect(
      isStudentPaid(
        input({
          charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: DUE_FUTURE, currency: Currency.EGP }],
        })
      )
    ).toBe(FamilyPaymentStatus.PAID);
  });

  it('counts a charge due at the cohort start even though the start is still ahead', () => {
    // "already due, or due at the cohort start" — the group cannot begin with this unpaid.
    expect(
      isStudentPaid(
        input({
          charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: COHORT_START, currency: Currency.EGP }],
        })
      )
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('is paid for a full scholarship, which has no charges at all', () => {
    expect(isStudentPaid(input({ subscriptionAmountMinor: 0, charges: [] }))).toBe(FamilyPaymentStatus.PAID);
  });

  it('is paid when the charges total zero, without dividing by anything', () => {
    expect(
      isStudentPaid(
        input({
          subscriptionAmountMinor: 0,
          charges: [{ amountMinor: 0, allocatedMinor: 0, dueAt: DUE_PAST, currency: Currency.EGP }],
        })
      )
    ).toBe(FamilyPaymentStatus.PAID);
  });

  it('is paid with an active subscription and no charges posted yet', () => {
    expect(isStudentPaid(input({ charges: [] }))).toBe(FamilyPaymentStatus.PAID);
  });

  it('is unpaid when any one of several due charges is short', () => {
    expect(
      isStudentPaid(
        input({
          charges: [
            { amountMinor: 10_000, allocatedMinor: 10_000, dueAt: DUE_PAST, currency: Currency.EGP },
            { amountMinor: 10_000, allocatedMinor: 9999, dueAt: DUE_PAST, currency: Currency.EGP },
          ],
        })
      )
    ).toBe(FamilyPaymentStatus.UNPAID);
  });

  it('treats a charge with no due date as due, so it cannot hide behind a null', () => {
    expect(
      isStudentPaid(
        input({
          charges: [{ amountMinor: 10_000, allocatedMinor: 0, dueAt: null, currency: Currency.EGP }],
        })
      )
    ).toBe(FamilyPaymentStatus.UNPAID);
  });
});
