import { Currency, FamilyPaymentState, PAYMENT_METHOD_RECEIPT_UPLOAD } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ReceiptUploadMethod } from './receipt-upload.method';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYER = new Types.ObjectId();

const makeMethod = () => {
  const created: Record<string, unknown>[] = [];
  const model = {
    create: jest.fn(async (doc: Record<string, unknown>) => {
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
  };
  return { method: new ReceiptUploadMethod(model as never), created };
};

const input = {
  organizationId: String(ORG),
  familyId: String(FAMILY),
  amountMinor: 10_000,
  currency: Currency.EGP,
  payerId: String(PAYER),
};

describe('ReceiptUploadMethod', () => {
  it('is registered under the shared key', () => {
    const { method } = makeMethod();
    expect(method.key).toBe(PAYMENT_METHOD_RECEIPT_UPLOAD);
  });

  it('is enabled when the organization lists it', () => {
    const { method } = makeMethod();
    expect(method.isEnabled({ enabledFamilyPaymentMethods: [PAYMENT_METHOD_RECEIPT_UPLOAD] } as never)).toBe(true);
  });

  it('is disabled when the organization does not list it', () => {
    const { method } = makeMethod();
    expect(method.isEnabled({ enabledFamilyPaymentMethods: ['ONLINE_GATEWAY'] } as never)).toBe(false);
  });

  it('is enabled by default when the organization has no list at all', () => {
    const { method } = makeMethod();
    // Receipt upload is the fallback every academy can always use.
    expect(method.isEnabled({} as never)).toBe(true);
  });

  it('creates a payment awaiting its receipt and returns that intent', async () => {
    const { method, created } = makeMethod();
    const result = await method.initiate(input);
    expect(created[0]).toMatchObject({
      method: PAYMENT_METHOD_RECEIPT_UPLOAD,
      status: FamilyPaymentState.AWAITING_RECEIPT,
      amountMinor: 10_000,
      receiptFileKey: null,
    });
    expect(result).toEqual({ kind: 'AWAIT_RECEIPT', paymentId: String(created[0]._id) });
  });

  it('never writes a ledger entry: nothing is money until an accountant approves it', async () => {
    const { method, created } = makeMethod();
    await method.initiate(input);
    expect(created[0]).not.toHaveProperty('ledgerEntryId');
    expect(created[0].status).not.toBe(FamilyPaymentState.CONFIRMED);
  });
});
