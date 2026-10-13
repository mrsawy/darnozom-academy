import { TASK_ESCALATION_HOURS, TASK_MAX_ESCALATION_LEVEL, TASK_MILESTONE_DAYS, TaskClosedReason, TaskKind, TaskStatus } from './academics.types';

describe('task shared types', () => {
  it('orders the milestones from the earliest to the most urgent', () => {
    expect([...TASK_MILESTONE_DAYS]).toEqual([7, 3, 1]);
  });

  it('escalates once a day, up to the manager level', () => {
    expect(TASK_ESCALATION_HOURS).toBe(24);
    expect(TASK_MAX_ESCALATION_LEVEL).toBe(2);
  });

  it('has exactly one task kind in the MVP', () => {
    expect(Object.values(TaskKind)).toEqual([TaskKind.PRE_START_READINESS]);
  });

  it('closes a task for one of three reasons only', () => {
    expect(Object.values(TaskClosedReason)).toEqual(['ITEM_DONE', 'GROUP_STARTED', 'GROUP_CANCELLED']);
  });

  it('has an open state distinct from both closed states', () => {
    expect(Object.values(TaskStatus)).toEqual(['OPEN', 'DONE', 'CANCELLED']);
  });
});
