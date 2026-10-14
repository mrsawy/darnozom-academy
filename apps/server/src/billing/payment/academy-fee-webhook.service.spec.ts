import { Currency, FamilyPaymentState } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { AcademyFeeWebhookService } from './academy-fee-webhook.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYMENT = new Types.ObjectId();
const PAYER = new Types.ObjectId();

const payment = (status = FamilyPaymentState.AWAITING_RECEIPT) => ({
  _id: PAYMENT,
  organizationId: ORG,
  familyId: FAMILY,
  method: 'ONLINE_GATEWAY',
  amountMinor: 10_000,
  currency: Currency.EGP,
  status,
  gatewayPaymentId: 'gw-123',
  payerId: PAYER,
});

const makeService = (found: Record<string, unknown> | null, claimWins = true) => {
  const paymentModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => found }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: claimWins ? 1 : 0 }) })),
  };
  const ledger = {
    postPaymentAndAllocate: jest.fn(async () => ({
      entry: { _id: new Types.ObjectId() },
      allocated: 1,
      unallocatedMinor: 0,
    })),
  };
  const notifications = { create: jest.fn().mockResolvedValue(null) };
  return {
    service: new AcademyFeeWebhookService(paymentModel as never, ledger as never, notifications as never),
    paymentModel,
    ledger,
  };
};

describe('AcademyFeeWebhookService.onConfirmed', () => {
  it('confirms the payment and writes exactly one ledger entry', async () => {
    const { service, ledger } = makeService(payment());
    await expect(service.onConfirmed('gw-123')).resolves.toBe(true);
    expect(ledger.postPaymentAndAllocate).toHaveBeenCalledTimes(1);
    expect(ledger.postPaymentAndAllocate).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: String(PAYMENT), amountMinor: 10_000, currency: Currency.EGP })
    );
  });

  it('claims the payment with a status guard before posting any money', async () => {
    const { service, paymentModel } = makeService(payment());
    await service.onConfirmed('gw-123');
    const calls = paymentModel.updateOne.mock.calls as unknown as [Record<string, unknown>, { $set: { status: FamilyPaymentState } }][];
    const [filter, update] = calls[0]!;
    expect(filter).toMatchObject({ _id: PAYMENT, status: { $ne: FamilyPaymentState.CONFIRMED } });
    expect(update.$set.status).toBe(FamilyPaymentState.CONFIRMED);
  });

  it('does nothing on a second delivery of the same webhook', async () => {
    const { service, ledger } = makeService(payment(), false);
    await expect(service.onConfirmed('gw-123')).resolves.toBe(false);
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('does nothing for a payment already confirmed', async () => {
    const { service, ledger } = makeService(payment(FamilyPaymentState.CONFIRMED));
    await expect(service.onConfirmed('gw-123')).resolves.toBe(false);
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('does nothing for a gateway reference it does not know', async () => {
    const { service, ledger } = makeService(null);
    await expect(service.onConfirmed('gw-unknown')).resolves.toBe(false);
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });
});
