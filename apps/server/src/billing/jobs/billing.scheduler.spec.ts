import { BillingScheduler } from './billing.scheduler';
import { BILLING_DAILY_CRON, BILLING_DAILY_JOB, BILLING_DAILY_TZ } from './billing.queue';

describe('BillingScheduler', () => {
  it('registers one repeatable daily billing run', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockResolvedValue({}) };
    await new BillingScheduler(queue as never).onModuleInit();
    expect(BILLING_DAILY_CRON).toBe('30 0 * * *');
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(BILLING_DAILY_JOB, { pattern: BILLING_DAILY_CRON, tz: BILLING_DAILY_TZ }, { name: BILLING_DAILY_JOB });
  });

  it('does not crash the app when Redis is unavailable at startup', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockRejectedValue(new Error('redis down')) };
    await expect(new BillingScheduler(queue as never).onModuleInit()).resolves.toBeUndefined();
  });
});
