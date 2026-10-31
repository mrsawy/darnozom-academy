import { BadRequestException } from '@nestjs/common';
import { BillingErrors, Currency, FamilyPaymentState, PAYMENT_METHOD_MANUAL_TRANSFER } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ManualTransferMethod } from './manual-transfer.method';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYER = new Types.ObjectId();
const CONFIG = new Types.ObjectId();

const input = {
  organizationId: String(ORG),
  familyId: String(FAMILY),
  amountMinor: 10_000,
  currency: Currency.EGP,
  payerId: String(PAYER),
  meta: { paymentMethodConfigId: String(CONFIG) },
};

const makeMethod = (opts: { config?: Record<string, unknown> | null } = {}) => {
  const created: Record<string, unknown>[] = [];
  const paymentModel = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
  };
  const configs = {
    get: jest.fn(async () => {
      if (opts.config === null || opts.config === undefined) {
        const error = new Error('not found');
        throw error;
      }
      return opts.config;
    }),
  };
  return { method: new ManualTransferMethod(paymentModel as never, configs as never), created, configs };
};

describe('ManualTransferMethod', () => {
  it('is registered under the shared key', () => {
    const { method } = makeMethod();
    expect(method.key).toBe(PAYMENT_METHOD_MANUAL_TRANSFER);
  });

  it('refuses initiate without a config id', async () => {
    const { method } = makeMethod();
    await expect(method.initiate({ ...input, meta: {} })).rejects.toThrow(new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_NOT_FOUND));
  });

  it('refuses a disabled config', async () => {
    const { method } = makeMethod({ config: { _id: CONFIG, enabled: false, label: 'InstaPay', fields: [] } });
    await expect(method.initiate(input)).rejects.toThrow(new BadRequestException(BillingErrors.PAYMENT_METHOD_CONFIG_DISABLED));
  });

  it('creates a payment snapshotting the config fields', async () => {
    const { method, created } = makeMethod({
      config: {
        _id: CONFIG,
        enabled: true,
        label: 'InstaPay',
        fields: [{ key: 'transferNumber', label: 'Number', type: 'TEXT', value: '0100' }],
      },
    });
    const result = await method.initiate(input);
    expect(created[0]).toMatchObject({
      method: PAYMENT_METHOD_MANUAL_TRANSFER,
      status: FamilyPaymentState.AWAITING_RECEIPT,
      paymentMethodConfigId: CONFIG,
      methodSnapshot: { label: 'InstaPay', fields: [{ key: 'transferNumber', label: 'Number', type: 'TEXT', value: '0100' }] },
    });
    expect(result).toEqual({ kind: 'AWAIT_RECEIPT', paymentId: String(created[0]._id) });
  });

  it('stores the subscription the payment was raised for, when given one', async () => {
    const subscriptionId = new Types.ObjectId();
    const { method, created } = makeMethod({ config: { _id: CONFIG, enabled: true, label: 'InstaPay', fields: [] } });
    await method.initiate({ ...input, meta: { ...input.meta, subscriptionId: String(subscriptionId) } });
    expect(String(created[0].subscriptionId)).toBe(String(subscriptionId));
  });

  it('stores no subscription when none is given, such as a general wallet top-up', async () => {
    const { method, created } = makeMethod({ config: { _id: CONFIG, enabled: true, label: 'InstaPay', fields: [] } });
    await method.initiate(input);
    expect(created[0].subscriptionId).toBeNull();
  });
});
