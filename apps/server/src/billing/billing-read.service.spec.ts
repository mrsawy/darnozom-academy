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

const makeService = (canRead: boolean) => {
  const families = {
    canActorReadFamily: jest.fn(async () => canRead),
  };
  const ledger = {
    statement: jest.fn(async () => [{ _id: 'entry-1', amountMinor: 1000 }]),
    balances: jest.fn(async () => [{ currency: Currency.EGP, chargedMinor: 1000, paidMinor: 0, balanceMinor: 1000 }]),
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
