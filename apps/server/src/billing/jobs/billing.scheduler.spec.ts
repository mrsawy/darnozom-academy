import { BillingScheduler } from './billing.scheduler';
import { BILLING_DAILY_EVERY_MS, BILLING_DAILY_JOB } from './billing.queue';

describe('BillingScheduler', () => {
  it('registers one repeatable daily billing run', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockResolvedValue({}) };
    await new BillingScheduler(queue as never).onModuleInit();
    expect(BILLING_DAILY_EVERY_MS).toBe(24 * 60 * 60 * 1000);
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(BILLING_DAILY_JOB, { every: BILLING_DAILY_EVERY_MS }, { name: BILLING_DAILY_JOB });
  });

  it('does not crash the app when Redis is unavailable at startup', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockRejectedValue(new Error('redis down')) };
    await expect(new BillingScheduler(queue as never).onModuleInit()).resolves.toBeUndefined();
  });
});
