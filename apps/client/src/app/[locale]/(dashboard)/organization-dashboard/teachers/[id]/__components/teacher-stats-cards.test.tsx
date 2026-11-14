import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ITeacherOverview } from '@/lib/types/academics/academics';
import { TeacherStatsCards } from './teacher-stats-cards';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- hoisted vi.mock factory
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

const stats: ITeacherOverview['stats'] = {
  total: 12,
  completed: 9,
  cancelled: 1,
  reportsMissing: 2,
  attendance: { PRESENT: 7, LATE: 2, EXCUSED: 0, ABSENT: 1, UNRECORDED: 0 },
  avgJoinDelayMinutes: 3.6,
  avgReportDelayHours: 1.25,
};

const card = (label: string) => within(screen.getByText(label).closest('[data-stat]') as HTMLElement);

describe('TeacherStatsCards', () => {
  it('shows the session counts and the missing reports', () => {
    render(<TeacherStatsCards stats={stats} />);
    expect(card('teacherPage.stats.total').getByText('12')).toBeInTheDocument();
    expect(card('teacherPage.stats.completed').getByText('9')).toBeInTheDocument();
    expect(card('teacherPage.stats.reportsMissing').getByText('2')).toBeInTheDocument();
  });

  it('shows the attendance breakdown including absences', () => {
    render(<TeacherStatsCards stats={stats} />);
    expect(card('sessions.attendance.statuses.PRESENT').getByText('7')).toBeInTheDocument();
    expect(card('sessions.attendance.statuses.LATE').getByText('2')).toBeInTheDocument();
    expect(card('sessions.attendance.statuses.ABSENT').getByText('1')).toBeInTheDocument();
  });

  it('rounds the join delay to whole minutes and the report delay to one decimal hour', () => {
    render(<TeacherStatsCards stats={stats} />);
    expect(card('teacherPage.stats.avgJoinDelay').getByText('teacherPage.minutes:{"count":4}')).toBeInTheDocument();
    expect(card('teacherPage.stats.avgReportDelay').getByText('teacherPage.hours:{"count":1.3}')).toBeInTheDocument();
  });

  it('shows a dash, not zero, when there is no join or report data', () => {
    render(<TeacherStatsCards stats={{ ...stats, avgJoinDelayMinutes: null, avgReportDelayHours: null }} />);
    expect(card('teacherPage.stats.avgJoinDelay').getByText('—')).toBeInTheDocument();
    expect(card('teacherPage.stats.avgReportDelay').getByText('—')).toBeInTheDocument();
  });
});
