import { Job } from 'bullmq';
import { BillingProcessor } from './billing.processor';
import { BILLING_DAILY_EVERY_MS, BILLING_DAILY_JOB } from './billing.queue';

const makeProcessor = () => {
  const monthlyCharges = { run: jest.fn(async () => 5) };
  const reminders = { run: jest.fn(async () => 3) };
  return {
    processor: new BillingProcessor(monthlyCharges as never, reminders as never),
    monthlyCharges,
    reminders,
  };
};

describe('BillingProcessor', () => {
  it('runs MonthlyChargesService before RemindersService, so a charge posted today can be reminded about', async () => {
    const { processor, monthlyCharges, reminders } = makeProcessor();
    const order: string[] = [];
    monthlyCharges.run.mockImplementation(async () => {
      order.push('monthly');
      return 5;
    });
    reminders.run.mockImplementation(async () => {
      order.push('reminders');
      return 3;
    });

    await processor.process({ name: BILLING_DAILY_JOB } as Job);
    expect(order).toEqual(['monthly', 'reminders']);
  });

  it('reports what it did', async () => {
    const { processor } = makeProcessor();
    await expect(processor.process({ name: BILLING_DAILY_JOB } as Job)).resolves.toEqual({
      charged: 5,
      reminded: 3,
    });
  });

  it('ignores a job it does not own', async () => {
    const { processor, monthlyCharges, reminders } = makeProcessor();
    await expect(processor.process({ name: 'something-else' } as Job)).resolves.toEqual({
      charged: 0,
      reminded: 0,
    });
    expect(monthlyCharges.run).not.toHaveBeenCalled();
    expect(reminders.run).not.toHaveBeenCalled();
  });

  it('runs daily, as the spec requires', () => {
    expect(BILLING_DAILY_EVERY_MS).toBe(24 * 60 * 60 * 1000);
  });
});
