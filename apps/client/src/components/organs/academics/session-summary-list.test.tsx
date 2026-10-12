import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import type { ISession } from '@/lib/types/academics/academics';
import { SessionSummaryList } from './session-summary-list';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const session = (over: Partial<ISession> = {}): ISession => ({
  _id: 's1',
  groupId: 'g',
  groupName: 'Group A',
  teacherId: 't',
  sequence: 2,
  startsAt: '2026-10-12T14:00:00.000Z',
  endsAt: '2026-10-12T15:00:00.000Z',
  status: SessionStatus.COMPLETED,
  attendance: [
    { studentId: 'kid', status: AttendanceStatus.LATE, markedAt: '2026-10-12T14:05:00Z' },
  ],
  report: {
    evaluations: [
      {
        studentId: 'kid',
        participation: 5,
        understanding: 4,
        behavior: 3,
        homework: 2,
        note: 'keep going',
      },
    ],
    submittedBy: 't',
    submittedAt: '2026-10-12T15:30:00Z',
  },
  ...over,
});

describe('SessionSummaryList', () => {
  it("shows the student's attendance and evaluation", () => {
    render(<SessionSummaryList sessions={[session()]} studentId="kid" />);
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('sessions.attendance.statuses.LATE')).toBeInTheDocument();
    expect(screen.getByText(/sessions\.report\.participation: 5/)).toBeInTheDocument();
    expect(screen.getByText('keep going')).toBeInTheDocument();
  });

  it('says so when nothing is recorded yet', () => {
    render(
      <SessionSummaryList
        sessions={[session({ attendance: [], report: null, status: SessionStatus.SCHEDULED })]}
        studentId="kid"
      />
    );
    expect(screen.getAllByText('sessions.family.notRecorded').length).toBeGreaterThan(0);
  });

  it('never shows another child that slipped into the payload', () => {
    render(
      <SessionSummaryList
        sessions={[
          session({
            attendance: [
              {
                studentId: 'other',
                status: AttendanceStatus.ABSENT,
                markedAt: '2026-10-12T14:05:00Z',
              },
            ],
            report: {
              evaluations: [
                {
                  studentId: 'other',
                  participation: 1,
                  understanding: 1,
                  behavior: 1,
                  homework: 1,
                  note: 'secret',
                },
              ],
              submittedBy: 't',
              submittedAt: '2026-10-12T15:30:00Z',
            },
          }),
        ]}
        studentId="kid"
      />
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.queryByText('sessions.attendance.statuses.ABSENT')).not.toBeInTheDocument();
  });

  it('shows an empty message for no sessions', () => {
    render(<SessionSummaryList sessions={[]} studentId="kid" />);
    expect(screen.getByText('sessions.family.empty')).toBeInTheDocument();
  });
});
