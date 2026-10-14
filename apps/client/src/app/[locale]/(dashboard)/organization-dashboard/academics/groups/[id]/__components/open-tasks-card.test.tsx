import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadinessKey, TaskStatus } from '@darnozom/shared-types';
import type { ITask } from '@/lib/types/academics/academics';
import { OpenTasksCard } from './open-tasks-card';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'en',
}));

const task: ITask = {
  _id: 't1',
  organizationId: 'o1',
  groupId: 'g1',
  groupName: 'Group A',
  kind: 'PRE_START_READINESS' as ITask['kind'],
  readinessKey: ReadinessKey.CONTENT_SENT,
  milestoneDays: 1,
  assigneeId: 'u1',
  escalationLevel: 2,
  dueAt: '2026-03-14T00:00:00.000Z',
  status: TaskStatus.OPEN,
  closedAt: null,
  closedReason: null,
  createdAt: '2026-03-13T00:00:00.000Z',
};

describe('OpenTasksCard', () => {
  it('says so when the group has no open tasks', () => {
    render(<OpenTasksCard tasks={[]} isLoading={false} />);
    expect(screen.getByText('tasks.empty')).toBeInTheDocument();
  });

  it('lists the missing item and the level it reached', () => {
    render(<OpenTasksCard tasks={[task]} isLoading={false} />);
    expect(screen.getByText('readiness.CONTENT_SENT')).toBeInTheDocument();
    expect(screen.getByText('tasks.level.2')).toBeInTheDocument();
  });

  it('shows the loading state while fetching', () => {
    render(<OpenTasksCard tasks={[]} isLoading />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});
