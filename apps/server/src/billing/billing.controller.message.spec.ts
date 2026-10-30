import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Roles, Subjects } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { BillingControllerMessage } from './billing.controller.message';

const proto = BillingControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

const context = () => ({
  userPayload: { _id: 'actor', organizationId: 'org', roleName: Roles.ACCOUNTANT, additionalRoles: [] },
}) as never;

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
  ['getSettings', 'billing.settings.get', Actions.READ, Subjects.BILLING],
  ['updateSettings', 'billing.settings.update', Actions.MANAGE, Subjects.BILLING],
  ['listPaymentMethodConfigs', 'billing.paymentMethodConfigs.list', Actions.READ, Subjects.BILLING],
  ['upsertPaymentMethodConfigFields', 'billing.paymentMethodConfigs.upsertFields', Actions.MANAGE, Subjects.BILLING],
  ['setPaymentMethodConfigEnabled', 'billing.paymentMethodConfigs.setEnabled', Actions.MANAGE, Subjects.BILLING],
  ['createCustomPaymentMethodConfig', 'billing.paymentMethodConfigs.createCustom', Actions.MANAGE, Subjects.BILLING],
];

describe('BillingControllerMessage', () => {
  it.each(expected)('%s answers %s and requires %s %s', (method, pattern, action, subject) => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto[method])).toEqual([pattern]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto[method])).toEqual([{ action, subject }]);
  });

  it('exposes exactly the documented handlers', () => {
    const handlers = Object.getOwnPropertyNames(BillingControllerMessage.prototype).filter((name) => name !== 'constructor');
    // eslint-disable-next-line unicorn/no-array-sort -- Test assertion comparing sorted arrays
    expect(handlers.sort()).toEqual(expected.map(([method]) => method).sort());
  });
});

describe('BillingControllerMessage delegation', () => {
  const makeController = () => {
    const subscriptions = {};
    const ledger = {};
    const familyPayments = {};
    const billingRead = {};
    const billingSettings = { get: jest.fn(), update: jest.fn() };
    const paymentMethodConfigs = { listForOrg: jest.fn(), upsertFields: jest.fn(), setEnabled: jest.fn(), createCustom: jest.fn() };
    const controller = new BillingControllerMessage(
      subscriptions as never,
      ledger as never,
      familyPayments as never,
      billingRead as never,
      billingSettings as never,
      paymentMethodConfigs as never
    );
    return { controller, billingSettings, paymentMethodConfigs };
  };

  it('billing.settings.update delegates to BillingSettingsService.update', () => {
    const { controller, billingSettings } = makeController();
    controller.updateSettings({ enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'] } as never, context());
    expect(billingSettings.update).toHaveBeenCalledWith(expect.anything(), { enabledFamilyPaymentMethods: ['RECEIPT_UPLOAD'] });
  });

  it('billing.paymentMethodConfigs.list delegates to PaymentMethodConfigService.listForOrg', () => {
    const { controller, paymentMethodConfigs } = makeController();
    controller.listPaymentMethodConfigs(context());
    expect(paymentMethodConfigs.listForOrg).toHaveBeenCalled();
  });
});
