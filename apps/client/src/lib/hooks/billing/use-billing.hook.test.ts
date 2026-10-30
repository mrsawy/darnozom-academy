import { describe, expect, it } from 'vitest';
import { billingKeys } from './use-billing.hook';

describe('billingKeys', () => {
  it('namespaces every key under billing, so one payment refreshes the ledger and the queue', () => {
    expect(billingKeys.statement('f1')[0]).toBe('billing');
    expect(billingKeys.receiptQueue()[0]).toBe('billing');
    expect(billingKeys.groupSubscriptions('g1')[0]).toBe('billing');
  });

  it('keys the statement by family and the subscriptions by group', () => {
    expect(billingKeys.statement('f1')).not.toEqual(billingKeys.statement('f2'));
    expect(billingKeys.groupSubscriptions('g1')).not.toEqual(billingKeys.groupSubscriptions('g2'));
  });

  it('namespaces the new payment method config and settings keys under billing too', () => {
    expect(billingKeys.paymentMethodConfigs[0]).toBe('billing');
    expect(billingKeys.settings[0]).toBe('billing');
  });

  it('namespaces the my-family-payments key under billing too', () => {
    expect(billingKeys.myFamilyPayments[0]).toBe('billing');
  });
});
