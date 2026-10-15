import { BILLING_REMINDER_INTERVAL_DAYS, Currency, LedgerEntryType, NotificationType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { RemindersService } from './reminders.service';

const ORG = new Types.ObjectId();
const FAMILY = new Types.ObjectId();
const NOW = new Date('2026-03-20T09:00:00.000Z');

const overdueCharge = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  organizationId: ORG,
  familyId: FAMILY,
  type: LedgerEntryType.CHARGE,
  amountMinor: 10_000,
  currency: Currency.EGP,
  dueAt: new Date('2026-03-10T00:00:00.000Z'),
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
});

const makeService = (charges: Record<string, unknown>[], lastReminderAt: Date | null = null, allocatedTotals: Record<string, number> = {}) => {
  const entryModel = { find: jest.fn(() => ({ lean: () => ({ exec: async () => charges }) })) };
  const allocationModel = {
    aggregate: jest.fn(async () => Object.entries(allocatedTotals).map(([id, total]) => ({ _id: new Types.ObjectId(id), total }))),
  };
  const notifications = {
    create: jest.fn(async () => ({}) as never),
    findLast: jest.fn(async () => (lastReminderAt ? { createdAt: lastReminderAt } : null)),
  };
  return { service: new RemindersService(entryModel as never, allocationModel as never, notifications as never), notifications };
};

describe('RemindersService.run', () => {
  it('reminds a family with an overdue, uncovered charge', async () => {
    const { service, notifications } = makeService([overdueCharge()]);
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ userId: String(FAMILY), type: NotificationType.INFO }));
  });

  it('sends one reminder per family per run, not one per charge', async () => {
    const { service, notifications } = makeService([overdueCharge(), overdueCharge(), overdueCharge()]);
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('does not remind about a charge that is not due yet', async () => {
    const { service, notifications } = makeService([overdueCharge({ dueAt: new Date('2026-04-10T00:00:00.000Z') })]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('does not remind when the overdue charge is fully covered', async () => {
    const charge = overdueCharge();
    const { service, notifications } = makeService([charge], null, { [String(charge._id)]: 10_000 });
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('still reminds when the charge is only partly covered', async () => {
    const charge = overdueCharge();
    const { service, notifications } = makeService([charge], null, { [String(charge._id)]: 4000 });
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalled();
  });

  it('waits the interval before reminding the same family again', async () => {
    const yesterday = new Date(NOW.getTime() - 24 * 3600 * 1000);
    const { service, notifications } = makeService([overdueCharge()], yesterday);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('reminds again once the interval has passed', async () => {
    const old = new Date(NOW.getTime() - (BILLING_REMINDER_INTERVAL_DAYS + 1) * 24 * 3600 * 1000);
    const { service, notifications } = makeService([overdueCharge()], old);
    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.create).toHaveBeenCalled();
  });

  it('reminds nobody when nothing is overdue', async () => {
    const { service, notifications } = makeService([]);
    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
