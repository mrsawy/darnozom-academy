import { SessionStatusProcessor } from './session-status.processor';
import { SWEEP_OVERDUE_JOB } from './session.queue';

describe('SessionStatusProcessor', () => {
  it('runs the overdue sweep for its job and returns the number of sessions changed', async () => {
    const completion = { sweepOverdue: jest.fn().mockResolvedValue(4) };
    const processor = new SessionStatusProcessor(completion as never);
    expect(await processor.process({ name: SWEEP_OVERDUE_JOB } as never)).toBe(4);
    expect(completion.sweepOverdue).toHaveBeenCalledWith(expect.any(Date));
  });

  it('ignores other job names', async () => {
    const completion = { sweepOverdue: jest.fn() };
    const processor = new SessionStatusProcessor(completion as never);
    expect(await processor.process({ name: 'something-else' } as never)).toBe(0);
    expect(completion.sweepOverdue).not.toHaveBeenCalled();
  });
});
