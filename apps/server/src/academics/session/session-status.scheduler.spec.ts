import { SessionStatusScheduler } from './session-status.scheduler';
import { SWEEP_EVERY_MS, SWEEP_OVERDUE_JOB } from './session.queue';

describe('SessionStatusScheduler', () => {
  it('registers one repeatable sweep every 5 minutes', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockResolvedValue({}) };
    await new SessionStatusScheduler(queue as never).onModuleInit();
    expect(SWEEP_EVERY_MS).toBe(5 * 60 * 1000);
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(SWEEP_OVERDUE_JOB, { every: SWEEP_EVERY_MS }, { name: SWEEP_OVERDUE_JOB });
  });

  it('does not crash the app when Redis is unavailable at startup', async () => {
    const queue = { upsertJobScheduler: jest.fn().mockRejectedValue(new Error('redis down')) };
    await expect(new SessionStatusScheduler(queue as never).onModuleInit()).resolves.toBeUndefined();
  });
});
