import { BadRequestException } from '@nestjs/common';
import { BillingErrors, Currency, FamilyPaymentState, PaymentProvider, PaymentPurpose, PAYMENT_METHOD_ONLINE_GATEWAY } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { OnlineGatewayMethod } from './online-gateway.method';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYER = new Types.ObjectId();

const makeMethod = (
  url = 'https://pay.example/checkout/abc',
  gatewayPaymentId = 'gw-123',
  configuredProvider: PaymentProvider | null = PaymentProvider.PAYMOB
) => {
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const orgModel = {
    findOne: jest.fn(() => ({
      lean: () => ({ exec: async () => ({ _id: ORG, academyFeeGatewayProvider: configuredProvider }) }),
    })),
  };
  const userModel = { findOne: jest.fn(() => ({ exec: async () => ({ _id: PAYER, email: 'p@example.com' }) })) };
  const orchestrator = { createPaymentUrl: jest.fn(async () => ({ paymentUrl: url, paymentId: gatewayPaymentId })) };
  return {
    method: new OnlineGatewayMethod(model as never, orgModel as never, userModel as never, orchestrator as never),
    created,
    orchestrator,
    model,
  };
};

const input = {
  organizationId: String(ORG),
  familyId: String(FAMILY),
  amountMinor: 10_000,
  currency: Currency.EGP,
  payerId: String(PAYER),
};

describe('OnlineGatewayMethod', () => {
  it('is registered under the shared key', () => {
    expect(makeMethod().method.key).toBe(PAYMENT_METHOD_ONLINE_GATEWAY);
  });

  it('is enabled only when the organization lists it and names a provider', () => {
    const { method } = makeMethod();
    expect(
      method.isEnabled({
        enabledFamilyPaymentMethods: [PAYMENT_METHOD_ONLINE_GATEWAY],
        academyFeeGatewayProvider: PaymentProvider.PAYMOB,
      } as never)
    ).toBe(true);
    expect(method.isEnabled({ enabledFamilyPaymentMethods: [PAYMENT_METHOD_ONLINE_GATEWAY] } as never)).toBe(false);
    expect(method.isEnabled({ academyFeeGatewayProvider: PaymentProvider.PAYMOB } as never)).toBe(false);
  });

  it('asks the existing orchestrator for a URL, under the academy-fee purpose', async () => {
    const { method, orchestrator } = makeMethod();
    await method.initiate(input);
    expect(orchestrator.createPaymentUrl).toHaveBeenCalledWith(
      expect.objectContaining({ provider: PaymentProvider.PAYMOB, purpose: PaymentPurpose.ACADEMY_FEE })
    );
  });

  it('converts minor units to the major amount the gateway expects', async () => {
    const { method, orchestrator } = makeMethod();
    await method.initiate(input);
    const calls = orchestrator.createPaymentUrl.mock.calls as unknown as [{ amount: number }][];
    expect(calls[0]![0].amount).toBe(100);
  });

  it('records the gateway reference on the payment, which is what the webhook matches', async () => {
    const { method, model } = makeMethod();
    await method.initiate(input);
    expect(model.updateOne).toHaveBeenCalledWith(expect.anything(), { $set: { gatewayPaymentId: 'gw-123' } });
  });

  it('returns a redirect the parent’s browser can follow', async () => {
    const { method, created } = makeMethod();
    const result = await method.initiate(input);
    expect(result).toEqual({
      kind: 'REDIRECT',
      url: 'https://pay.example/checkout/abc',
      paymentId: String(created[0]!._id),
    });
  });

  it('starts the payment awaiting the gateway, never confirmed', async () => {
    const { method, created } = makeMethod();
    await method.initiate(input);
    expect(created[0]!.status).toBe(FamilyPaymentState.AWAITING_RECEIPT);
  });

  it('refuses to start when the organization has configured no provider', async () => {
    // Ruling: makeMethod parameter controls configuredProvider without mutating private fields
    const { method } = makeMethod('https://pay.example/checkout/abc', 'gw-123', null);
    await expect(method.initiate(input)).rejects.toThrow(new BadRequestException(BillingErrors.GATEWAY_NOT_CONFIGURED));
  });
});
