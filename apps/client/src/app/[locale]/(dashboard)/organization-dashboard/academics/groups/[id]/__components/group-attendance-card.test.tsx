import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import type { IAttendanceMatrix } from '@/lib/types/academics/academics';
import { GroupAttendanceCard } from './group-attendance-card';

const state: { data?: IAttendanceMatrix; isLoading: boolean } = { isLoading: false };

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- hoisted vi.mock factory
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useLocale: () => 'en',
}));
vi.mock('@/lib/hooks/academics/use-academics.hook', () => ({
  useGroupAttendanceMatrix: () => state,
}));

const matrix: IAttendanceMatrix = {
  sessions: [
    { id: 's1', sequence: 1, startsAt: '2026-01-05T10:00:00Z', status: SessionStatus.COMPLETED, teacherAttendance: AttendanceStatus.PRESENT },
    { id: 's2', sequence: 2, startsAt: '2026-01-12T10:00:00Z', status: SessionStatus.COMPLETED, teacherAttendance: AttendanceStatus.LATE },
  ],
  students: [
    { studentId: 'a', name: 'Amal K', cells: { s1: AttendanceStatus.PRESENT, s2: AttendanceStatus.ABSENT }, attendedRate: 0.5 },
    { studentId: 'b', name: 'Bilal R', cells: { s1: AttendanceStatus.LATE, s2: null }, attendedRate: 0.5 },
  ],
  teacherAttendedRate: 1,
};

describe('GroupAttendanceCard', () => {
  it('shows a row per student with a coded cell per session, a dash where nothing was recorded, and the attendance rate', () => {
    state.data = matrix;
    render(<GroupAttendanceCard groupId="g1" />);
    const amal = within(screen.getByRole('row', { name: /Amal K/ }));
    expect(amal.getByText('sessions.attendance.short.PRESENT')).toBeInTheDocument();
    expect(amal.getByText('sessions.attendance.short.ABSENT')).toBeInTheDocument();
    expect(amal.getByText('50%')).toBeInTheDocument();
    const bilal = within(screen.getByRole('row', { name: /Bilal R/ }));
    expect(bilal.getByText('sessions.attendance.short.LATE')).toBeInTheDocument();
    expect(bilal.getByText('—')).toBeInTheDocument();
  });

  it('shows the teacher row first with their own rate', () => {
    state.data = matrix;
    render(<GroupAttendanceCard groupId="g1" />);
    const rows = screen.getAllByRole('row');
    const teacher = within(rows[1]);
    expect(teacher.getByText('sessions.attendance.teacher')).toBeInTheDocument();
    expect(teacher.getByText('100%')).toBeInTheDocument();
  });

  it('shows a dash instead of a rate before any session was held', () => {
    state.data = { ...matrix, students: [{ studentId: 'a', name: 'Amal K', cells: { s1: null, s2: null }, attendedRate: null }], teacherAttendedRate: null };
    render(<GroupAttendanceCard groupId="g1" />);
    expect(within(screen.getByRole('row', { name: /Amal K/ })).getAllByText('—').length).toBe(3);
  });

  it('says so when the group has no sessions yet', () => {
    state.data = { sessions: [], students: [], teacherAttendedRate: null };
    render(<GroupAttendanceCard groupId="g1" />);
    expect(screen.getByText('sessions.empty')).toBeInTheDocument();
  });
});
