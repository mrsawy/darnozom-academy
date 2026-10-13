import { describe, expect, it } from 'vitest';
import { TaskStatus } from '@darnozom/shared-types';
import { academicsKeys } from './use-academics.hook';

describe('academicsKeys task entries', () => {
  it('namespaces task queries under academics so one mutation refreshes them all', () => {
    expect(academicsKeys.myTasks({ status: TaskStatus.OPEN })[0]).toBe('academics');
    expect(academicsKeys.groupTasks('g1')[0]).toBe('academics');
  });

  it('keys my-tasks by its query, so changing the filter refetches', () => {
    expect(academicsKeys.myTasks({ status: TaskStatus.OPEN })).not.toEqual(academicsKeys.myTasks({}));
  });

  it('keys group tasks by group', () => {
    expect(academicsKeys.groupTasks('g1')).not.toEqual(academicsKeys.groupTasks('g2'));
  });
});
