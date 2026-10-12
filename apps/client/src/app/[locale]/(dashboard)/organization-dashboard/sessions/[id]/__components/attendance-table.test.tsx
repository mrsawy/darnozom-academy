import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AttendanceStatus } from '@darnozom/shared-types';
import { AttendanceTable } from './attendance-table';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const people = { a: 'Amal K', b: 'Bilal R' };
const present = 'sessions.attendance.statuses.PRESENT';
const late = 'sessions.attendance.statuses.LATE';

describe('AttendanceTable', () => {
  it('cannot be saved until at least one student has a status', () => {
    render(
      <AttendanceTable
        roster={['a', 'b']}
        people={people}
        attendance={[]}
        disabled={false}
        pending={false}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('sessions.attendance.save')).toBeDisabled();
  });

  it('sends one entry per student that was marked, with the trimmed note', () => {
    const onSave = vi.fn();
    render(
      <AttendanceTable
        roster={['a', 'b']}
        people={people}
        attendance={[]}
        disabled={false}
        pending={false}
        onSave={onSave}
      />
    );
    fireEvent.click(within(screen.getByRole('group', { name: 'Amal K' })).getByText(present));
    fireEvent.click(within(screen.getByRole('group', { name: 'Bilal R' })).getByText(late));
    fireEvent.change(screen.getAllByLabelText('sessions.attendance.note')[1], {
      target: { value: ' bus ' },
    });
    fireEvent.click(screen.getByText('sessions.attendance.save'));
    expect(onSave).toHaveBeenCalledWith([
      { studentId: 'a', status: AttendanceStatus.PRESENT },
      { studentId: 'b', status: AttendanceStatus.LATE, note: 'bus' },
    ]);
  });

  it('starts from the attendance already recorded', () => {
    render(
      <AttendanceTable
        roster={['a']}
        people={people}
        attendance={[
          { studentId: 'a', status: AttendanceStatus.ABSENT, markedAt: '2026-10-12T14:00:00Z' },
        ]}
        disabled={false}
        pending={false}
        onSave={vi.fn()}
      />
    );
    const button = within(screen.getByRole('group', { name: 'Amal K' })).getByText(
      'sessions.attendance.statuses.ABSENT'
    );
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('is read-only when disabled', () => {
    render(
      <AttendanceTable
        roster={['a']}
        people={people}
        attendance={[]}
        disabled
        pending={false}
        onSave={vi.fn()}
      />
    );
    expect(within(screen.getByRole('group', { name: 'Amal K' })).getByText(present)).toBeDisabled();
  });
});
