import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Subjects } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { BillingControllerMessage } from './billing.controller.message';

const proto = BillingControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

const expected: [string, string, Actions, Subjects][] = [
  ['createSubscription', 'billing.subscriptions.create', Actions.MANAGE, Subjects.BILLING],
  ['listSubscriptionsForGroup', 'billing.subscriptions.listForGroup', Actions.READ, Subjects.BILLING],
  ['listSubscriptionsForFamily', 'billing.subscriptions.listForFamily', Actions.READ, Subjects.BILLING],
  ['endSubscription', 'billing.subscriptions.end', Actions.MANAGE, Subjects.BILLING],
  ['statement', 'billing.ledger.statement', Actions.READ, Subjects.BILLING],
  ['adjust', 'billing.ledger.adjust', Actions.MANAGE, Subjects.BILLING],
  ['listPaymentMethods', 'billing.payments.methods', Actions.CREATE, Subjects.FAMILY_PAYMENT],
  ['listAllPaymentMethods', 'billing.payments.methods.all', Actions.MANAGE, Subjects.BILLING],
  ['initiatePayment', 'billing.payments.initiate', Actions.CREATE, Subjects.FAMILY_PAYMENT],
  ['attachReceipt', 'billing.payments.attachReceipt', Actions.CREATE, Subjects.FAMILY_PAYMENT],
  ['reviewQueue', 'billing.payments.queue', Actions.MANAGE, Subjects.FAMILY_PAYMENT],
  ['approvePayment', 'billing.payments.approve', Actions.MANAGE, Subjects.FAMILY_PAYMENT],
  ['rejectPayment', 'billing.payments.reject', Actions.MANAGE, Subjects.FAMILY_PAYMENT],
];

describe('BillingControllerMessage', () => {
  it.each(expected)('%s answers %s and requires %s %s', (method, pattern, action, subject) => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto[method])).toEqual([pattern]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto[method])).toEqual([{ action, subject }]);
  });

  it('exposes exactly the 12 documented handlers', () => {
    const handlers = Object.getOwnPropertyNames(BillingControllerMessage.prototype).filter((name) => name !== 'constructor');
    // eslint-disable-next-line unicorn/no-array-sort -- Test assertion comparing sorted arrays
    expect(handlers.sort()).toEqual(expected.map(([method]) => method).sort());
  });
});
