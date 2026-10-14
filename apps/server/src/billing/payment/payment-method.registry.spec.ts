import { BadRequestException } from '@nestjs/common';
import { BillingErrors, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { FamilyPaymentMethod } from './payment-method.interface';
import { FamilyPaymentMethodRegistry } from './payment-method.registry';

const method = (key: string, enabled = true): FamilyPaymentMethod => ({
  key,
  isEnabled: () => enabled,
  initiate: async () => ({ kind: 'AWAIT_RECEIPT', paymentId: 'p1' }),
});

const org = { _id: 'o1', enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD] } as never;

describe('FamilyPaymentMethodRegistry', () => {
  it('returns a registered method by its key', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A'), method('B')]);
    expect(registry.get('B').key).toBe('B');
  });

  it('refuses an unknown key rather than returning undefined', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A')]);
    expect(() => registry.get('NOPE')).toThrow(new BadRequestException(BillingErrors.PAYMENT_METHOD_UNKNOWN));
  });

  it('lists only the methods the organization has switched on', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A', true), method('B', false)]);
    expect(registry.listEnabled(org).map((m) => m.key)).toEqual(['A']);
  });

  it('lists nothing when no method is enabled, rather than silently defaulting', () => {
    const registry = new FamilyPaymentMethodRegistry([method('A', false)]);
    expect(registry.listEnabled(org)).toEqual([]);
  });

  it('accepts a method registered by a test, which is what proves the extension point works', () => {
    const fake = method('FAKE_BANK_TRANSFER');
    const registry = new FamilyPaymentMethodRegistry([method('A'), fake]);
    expect(registry.get('FAKE_BANK_TRANSFER')).toBe(fake);
    expect(registry.listEnabled(org).map((m) => m.key)).toContain('FAKE_BANK_TRANSFER');
  });

  it('survives an empty provider list', () => {
    const registry = new FamilyPaymentMethodRegistry([]);
    expect(registry.listEnabled(org)).toEqual([]);
  });
});
