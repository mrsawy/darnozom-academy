import { ForbiddenException } from '@nestjs/common';
import { BillingErrors, Currency, Roles } from '@darnozom/shared-types';
import { BillingReadService } from './billing-read.service';
import { BillingActor } from './billing.types';

const ACTOR: BillingActor = {
  _id: 'user-1',
  organizationId: 'org-1',
  roleName: Roles.PARENT,
  additionalRoles: [],
};

const makeService = (canRead: boolean, openCharges: Record<string, unknown>[] = []) => {
  const families = {
    canActorReadFamily: jest.fn(async () => canRead),
  };
  const ledger = {
    statement: jest.fn(async () => [{ _id: 'entry-1', amountMinor: 1000 }]),
    balances: jest.fn(async () => [{ currency: Currency.EGP, chargedMinor: 1000, paidMinor: 0, balanceMinor: 1000 }]),
    openCharges: jest.fn(async () => openCharges),
  };
  const subscriptions = {
    findForFamily: jest.fn(async () => [{ _id: 'sub-1' }]),
  };
  const service = new BillingReadService(families as never, ledger as never, subscriptions as never);
  return { service, families, ledger, subscriptions };
};

describe('BillingReadService', () => {
  describe('statementFor', () => {
    it('returns statement and balances when actor is allowed to read family', async () => {
      const { service, families, ledger } = makeService(true);
      const result = await service.statementFor(ACTOR, 'fam-1');
      expect(families.canActorReadFamily).toHaveBeenCalledWith(ACTOR, 'fam-1');
      expect(ledger.statement).toHaveBeenCalledWith('fam-1');
      expect(ledger.balances).toHaveBeenCalledWith('fam-1');
      expect(result.entries).toHaveLength(1);
      expect(result.balances).toHaveLength(1);
    });

    it('throws ForbiddenException when actor cannot read family', async () => {
      const { service, families, ledger } = makeService(false);
      await expect(service.statementFor(ACTOR, 'other-fam')).rejects.toThrow(new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY));
      expect(families.canActorReadFamily).toHaveBeenCalledWith(ACTOR, 'other-fam');
      expect(ledger.statement).not.toHaveBeenCalled();
    });

    it('groups outstanding charges by subscription, summing amount and counting charges', async () => {
      const { service } = makeService(true, [
        { chargeLedgerEntryId: 'c1', currency: Currency.EGP, amountMinor: 1000, alreadyAllocatedMinor: 0, subscriptionId: 'sub-1', studentId: 'student-1' },
        { chargeLedgerEntryId: 'c2', currency: Currency.EGP, amountMinor: 1000, alreadyAllocatedMinor: 0, subscriptionId: 'sub-1', studentId: 'student-1' },
        { chargeLedgerEntryId: 'c3', currency: Currency.EGP, amountMinor: 500, alreadyAllocatedMinor: 0, subscriptionId: 'sub-2', studentId: 'student-2' },
      ]);
      const result = await service.statementFor(ACTOR, 'fam-1');
      expect(result.openSubscriptions).toEqual(
        expect.arrayContaining([
          { subscriptionId: 'sub-1', currency: Currency.EGP, outstandingMinor: 2000, chargeCount: 2, studentIds: ['student-1'] },
          { subscriptionId: 'sub-2', currency: Currency.EGP, outstandingMinor: 500, chargeCount: 1, studentIds: ['student-2'] },
        ])
      );
    });

    it('excludes a charge that is already fully allocated', async () => {
      const { service } = makeService(true, [
        { chargeLedgerEntryId: 'c1', currency: Currency.EGP, amountMinor: 1000, alreadyAllocatedMinor: 1000, subscriptionId: 'sub-1', studentId: 'student-1' },
      ]);
      const result = await service.statementFor(ACTOR, 'fam-1');
      expect(result.openSubscriptions).toEqual([]);
    });

    it('excludes a charge with no subscription, such as a hand-made adjustment-era charge', async () => {
      const { service } = makeService(true, [
        { chargeLedgerEntryId: 'c1', currency: Currency.EGP, amountMinor: 1000, alreadyAllocatedMinor: 0, subscriptionId: null, studentId: null },
      ]);
      const result = await service.statementFor(ACTOR, 'fam-1');
      expect(result.openSubscriptions).toEqual([]);
    });
  });

  describe('subscriptionsFor', () => {
    it('returns subscriptions when actor is allowed to read family', async () => {
      const { service, families, subscriptions } = makeService(true);
      const result = await service.subscriptionsFor(ACTOR, 'fam-1');
      expect(families.canActorReadFamily).toHaveBeenCalledWith(ACTOR, 'fam-1');
      expect(subscriptions.findForFamily).toHaveBeenCalledWith(ACTOR, 'fam-1');
      expect(result).toHaveLength(1);
    });

    it('throws ForbiddenException when actor cannot read family', async () => {
      const { service, families, subscriptions } = makeService(false);
      await expect(service.subscriptionsFor(ACTOR, 'other-fam')).rejects.toThrow(new ForbiddenException(BillingErrors.NOT_YOUR_FAMILY));
      expect(families.canActorReadFamily).toHaveBeenCalledWith(ACTOR, 'other-fam');
      expect(subscriptions.findForFamily).not.toHaveBeenCalled();
    });
  });
});
