import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskStatus } from '@darnozom/shared-types';
import type { ITask } from '@/lib/types/academics/academics';
import { MyTasksList } from './my-tasks-list';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'en',
}));

const makeTask = (overrides: Partial<ITask> = {}): ITask => ({
  _id: 't1',
  organizationId: 'org1',
  groupId: 'g1',
  groupName: 'Quran Beginners',
  kind: 'PRE_START' as ITask['kind'],
  readinessKey: 'TEACHER_ASSIGNED' as ITask['readinessKey'],
  milestoneDays: 7,
  assigneeId: 'u1',
  escalationLevel: 0,
  dueAt: '2026-11-01T00:00:00.000Z',
  status: TaskStatus.OPEN,
  closedAt: null,
  closedReason: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

describe('MyTasksList', () => {
  it('shows a loading message while fetching', () => {
    render(<MyTasksList tasks={[]} isLoading onMarkDone={vi.fn()} />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('shows the empty state when there are no tasks', () => {
    render(<MyTasksList tasks={[]} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getByText('tasks.empty')).toBeInTheDocument();
  });

  it('renders group name and readiness key for each task', () => {
    const task = makeTask();
    render(<MyTasksList tasks={[task]} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getByText('Quran Beginners')).toBeInTheDocument();
    expect(screen.getByText('TEACHER_ASSIGNED')).toBeInTheDocument();
  });

  it('shows an escalation level badge', () => {
    const task = makeTask({ escalationLevel: 1 });
    render(<MyTasksList tasks={[task]} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getByText('tasks.level.1')).toBeInTheDocument();
  });

  it('calls onMarkDone with the task id when the mark-done button is clicked', () => {
    const onMarkDone = vi.fn();
    const task = makeTask({ _id: 'abc' });
    render(<MyTasksList tasks={[task]} isLoading={false} onMarkDone={onMarkDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'tasks.markDone' }));
    expect(onMarkDone).toHaveBeenCalledWith('abc');
  });

  it('renders one row per task', () => {
    const tasks = [makeTask({ _id: 't1' }), makeTask({ _id: 't2', groupName: 'Fiqh Advanced' })];
    render(<MyTasksList tasks={tasks} isLoading={false} onMarkDone={vi.fn()} />);
    expect(screen.getByText('Fiqh Advanced')).toBeInTheDocument();
  });
});
