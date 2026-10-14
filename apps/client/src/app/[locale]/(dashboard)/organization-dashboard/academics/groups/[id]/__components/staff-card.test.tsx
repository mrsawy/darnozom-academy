import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AtRiskReason } from '@darnozom/shared-types';
import { StaffCard } from './staff-card';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const candidates = [
  { _id: 'u1', firstName: 'Nour', lastName: 'Ali', roleName: 'COORDINATOR', additionalRoles: [] },
  { _id: 'u2', firstName: 'Omar', lastName: 'Saad', roleName: 'SUPERVISOR', additionalRoles: [] },
];

const group = {
  coordinatorId: 'u1',
  supervisorId: null as string | null,
  atRisk: false,
  atRiskReason: null as AtRiskReason | null,
};

describe('StaffCard', () => {
  it('shows the assigned coordinator', () => {
    render(<StaffCard group={group} candidates={candidates} onChange={vi.fn()} />);
    expect(screen.getAllByText('Nour Ali').length).toBeGreaterThan(0);
  });

  it('says the supervisor seat is empty', () => {
    render(<StaffCard group={group} candidates={candidates} onChange={vi.fn()} />);
    expect(screen.getAllByText('tasks.unassigned').length).toBeGreaterThan(0);
  });

  it('shows no at-risk badge for a healthy group', () => {
    render(<StaffCard group={group} candidates={candidates} onChange={vi.fn()} />);
    expect(screen.queryByText('tasks.atRisk')).not.toBeInTheDocument();
  });

  it('shows the at-risk badge and its reason', () => {
    render(
      <StaffCard
        group={{ ...group, atRisk: true, atRiskReason: AtRiskReason.NO_COORDINATOR }}
        candidates={candidates}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('tasks.atRisk')).toBeInTheDocument();
    expect(screen.getByText('tasks.atRiskReason.NO_COORDINATOR')).toBeInTheDocument();
  });
});
