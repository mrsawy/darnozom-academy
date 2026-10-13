import { Job } from 'bullmq';
import { PreStartTaskProcessor } from './task.processor';
import { PRE_START_SWEEP_EVERY_MS, PRE_START_SWEEP_JOB } from './task.queue';

const makeProcessor = () => {
  const generation = { run: jest.fn(async () => 2) };
  const escalation = { run: jest.fn(async () => 1) };
  return { processor: new PreStartTaskProcessor(generation as never, escalation as never), generation, escalation };
};

describe('PreStartTaskProcessor', () => {
  it('generates before it escalates, so a task created now is not instantly overdue', async () => {
    const { processor, generation, escalation } = makeProcessor();
    const order: string[] = [];
    generation.run.mockImplementation(async () => {
      order.push('generate');
      return 2;
    });
    escalation.run.mockImplementation(async () => {
      order.push('escalate');
      return 1;
    });
    await processor.process({ name: PRE_START_SWEEP_JOB } as Job);
    expect(order).toEqual(['generate', 'escalate']);
  });

  it('reports what it did', async () => {
    const { processor } = makeProcessor();
    await expect(processor.process({ name: PRE_START_SWEEP_JOB } as Job)).resolves.toEqual({ created: 2, escalated: 1 });
  });

  it('ignores a job it does not own', async () => {
    const { processor, generation, escalation } = makeProcessor();
    await expect(processor.process({ name: 'something-else' } as Job)).resolves.toEqual({ created: 0, escalated: 0 });
    expect(generation.run).not.toHaveBeenCalled();
    expect(escalation.run).not.toHaveBeenCalled();
  });

  it('sweeps every fifteen minutes, as the spec requires', () => {
    expect(PRE_START_SWEEP_EVERY_MS).toBe(15 * 60 * 1000);
  });
});
