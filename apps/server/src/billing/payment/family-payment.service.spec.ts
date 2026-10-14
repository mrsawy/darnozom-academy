import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingErrors, Currency, FamilyPaymentState, Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { FamilyPaymentService } from './family-payment.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const PAYMENT = new Types.ObjectId();
const ACCOUNTANT = new Types.ObjectId();

const actor = (id: Types.ObjectId, roleName: Roles) => ({
  _id: String(id),
  organizationId: String(ORG),
  roleName,
  additionalRoles: [] as Roles[],
});

const payment = (overrides: Record<string, unknown> = {}) => ({
  _id: PAYMENT,
  organizationId: ORG,
  familyId: FAMILY,
  method: 'RECEIPT_UPLOAD',
  amountMinor: 10_000,
  currency: Currency.EGP,
  status: FamilyPaymentState.PENDING_REVIEW,
  receiptFileKey: 'receipts/a.jpg',
  gatewayPaymentId: null,
  payerId: FAMILY,
  ...overrides,
});

const makeService = (found: Record<string, unknown> | null = payment(), claimWins = true) => {
  const paymentModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => found }) })),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => (found ? [found] : []) }) }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: claimWins ? 1 : 0 }) })),
  };
  const ledger = {
    postPaymentAndAllocate: jest.fn(async () => ({
      entry: { _id: new Types.ObjectId() },
      allocated: 1,
      unallocatedMinor: 0,
    })),
  };
  const registry = {
    get: jest.fn(() => ({
      key: 'RECEIPT_UPLOAD',
      isEnabled: () => true,
      initiate: async () => ({ kind: 'AWAIT_RECEIPT', paymentId: String(PAYMENT) }),
    })),
    listEnabled: jest.fn(() => [{ key: 'RECEIPT_UPLOAD' }]),
  };
  const families = {
    canActorReadFamily: jest.fn(
      async (act: { _id: string; roleName?: Roles }, famId: string) =>
        act?.roleName === Roles.ACCOUNTANT || act?.roleName === Roles.MANAGER || String(act?._id) === String(famId)
    ),
    resolve: jest.fn(async () => new Map()),
  };
  const orgModel = {
    findOne: jest.fn(() => ({
      lean: () => ({ exec: async () => ({ _id: ORG, enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'] }) }),
    })),
  };
  const files = { fileExists: jest.fn(async () => true) };
  const notifications = { create: jest.fn().mockResolvedValue(null) };
  const service = new FamilyPaymentService(
    paymentModel as never,
    orgModel as never,
    registry as never,
    ledger as never,
    families as never,
    files as never,
    notifications as never
  );
  return { service, paymentModel, ledger, registry, families, notifications };
};

describe('FamilyPaymentService.listMethods', () => {
  it('lists what the organization has enabled', async () => {
    const { service, registry } = makeService();
    await expect(service.listMethods(actor(FAMILY, Roles.PARENT))).resolves.toEqual([{ key: 'RECEIPT_UPLOAD' }]);
    expect(registry.listEnabled).toHaveBeenCalled();
  });
});

describe('FamilyPaymentService.initiate', () => {
  it('refuses a method the organization has not enabled', async () => {
    const { service, registry } = makeService();
    registry.listEnabled.mockReturnValueOnce([]);
    await expect(
      service.initiate(actor(FAMILY, Roles.PARENT), {
        method: 'RECEIPT_UPLOAD',
        amountMinor: 10_000,
        currency: Currency.EGP,
      })
    ).rejects.toThrow(new BadRequestException(BillingErrors.PAYMENT_METHOD_DISABLED));
  });

  it('refuses a zero or fractional amount', async () => {
    const { service } = makeService();
    for (const amountMinor of [0, 10.5, -1]) {
      await expect(
        service.initiate(actor(FAMILY, Roles.PARENT), {
          method: 'RECEIPT_UPLOAD',
          amountMinor,
          currency: Currency.EGP,
        })
      ).rejects.toThrow(new BadRequestException(BillingErrors.AMOUNT_INVALID));
    }
  });

  it('pays into the caller’s own family, not one they name', async () => {
    const { service, registry } = makeService();
    const initiate = jest.fn(async () => ({ kind: 'AWAIT_RECEIPT' as const, paymentId: String(PAYMENT) }));
    registry.get.mockReturnValueOnce({ key: 'RECEIPT_UPLOAD', isEnabled: () => true, initiate } as never);
    await service.initiate(actor(FAMILY, Roles.PARENT), {
      method: 'RECEIPT_UPLOAD',
      amountMinor: 10_000,
      currency: Currency.EGP,
    });
    expect(initiate).toHaveBeenCalledWith(expect.objectContaining({ familyId: String(FAMILY), payerId: String(FAMILY) }));
  });
});

describe('FamilyPaymentService.attachReceipt', () => {
  it('moves the payment to pending review', async () => {
    const { service, paymentModel } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT }));
    await service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), 'receipts/b.jpg');
    expect(paymentModel.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: PAYMENT }), {
      $set: { receiptFileKey: 'receipts/b.jpg', status: FamilyPaymentState.PENDING_REVIEW },
    });
  });

  it('requires a file key', async () => {
    const { service } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT }));
    await expect(service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), '  ')).rejects.toThrow(
      new BadRequestException(BillingErrors.RECEIPT_REQUIRED)
    );
  });

  it('refuses a parent attaching to another family’s payment', async () => {
    const { service } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT, familyId: new Types.ObjectId() }));
    await expect(service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), 'receipts/b.jpg')).rejects.toThrow(
      new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY)
    );
  });

  it('refuses attaching to a confirmed payment', async () => {
    const { service } = makeService(payment({ status: FamilyPaymentState.CONFIRMED }));
    await expect(service.attachReceipt(actor(FAMILY, Roles.PARENT), String(PAYMENT), 'receipts/b.jpg')).rejects.toThrow(
      new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE)
    );
  });
});

describe('FamilyPaymentService.approve', () => {
  it('writes exactly one ledger entry and notifies the family', async () => {
    const { service, ledger, notifications } = makeService();
    await service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT));
    expect(ledger.postPaymentAndAllocate).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ userId: String(FAMILY) }));
  });

  it('claims the payment before posting, so two accountants cannot both approve it', async () => {
    const { service, paymentModel } = makeService();
    await service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT));
    const calls = paymentModel.updateOne.mock.calls as unknown as [Record<string, unknown>, Record<string, unknown>][];
    const [filter] = calls[0]!;
    expect(filter).toMatchObject({ _id: PAYMENT, status: FamilyPaymentState.PENDING_REVIEW });
  });

  it('posts nothing when it lost the race', async () => {
    const { service, ledger } = makeService(payment(), false);
    await expect(service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT))).rejects.toThrow(
      new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE)
    );
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('refuses a payment that is not awaiting review', async () => {
    const { service, ledger } = makeService(payment({ status: FamilyPaymentState.AWAITING_RECEIPT }));
    await expect(service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT))).rejects.toThrow(
      new ConflictException(BillingErrors.PAYMENT_NOT_REVIEWABLE)
    );
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
  });

  it('404s on a payment in another organization', async () => {
    const { service } = makeService(null);
    await expect(service.approve(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT))).rejects.toThrow(
      new NotFoundException(BillingErrors.PAYMENT_NOT_FOUND)
    );
  });
});

describe('FamilyPaymentService.reject', () => {
  it('requires a reason', async () => {
    const { service } = makeService();
    await expect(service.reject(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT), ' ')).rejects.toThrow(
      new BadRequestException(BillingErrors.REJECT_REASON_REQUIRED)
    );
  });

  it('writes no ledger entry and notifies the family with the reason', async () => {
    const { service, ledger, notifications } = makeService();
    await service.reject(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT), 'Receipt is unreadable.');
    expect(ledger.postPaymentAndAllocate).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: String(FAMILY),
        params: expect.objectContaining({ reason: 'Receipt is unreadable.' }),
      })
    );
  });

  it('records who rejected it and when', async () => {
    const { service, paymentModel } = makeService();
    await service.reject(actor(ACCOUNTANT, Roles.ACCOUNTANT), String(PAYMENT), 'No.');
    const calls = paymentModel.updateOne.mock.calls as unknown as [Record<string, unknown>, { $set: Record<string, unknown> }][];
    const [, update] = calls[0]!;
    expect(update.$set).toMatchObject({
      status: FamilyPaymentState.REJECTED,
      rejectReason: 'No.',
      reviewedBy: expect.anything(),
      reviewedAt: expect.any(Date),
    });
  });
});
