import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SUPERVISION_CRITERIA } from '@darnozom/shared-types';
import type { ISupervisionEvaluation } from '@/lib/types/academics/academics';
import { EvaluationList } from './evaluation-list';

vi.mock('next-intl', () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vitest hoists vi.mock before module variables
  const t = (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key;
  return {
    useTranslations: () => t,
    useLocale: () => 'en',
  };
});

const evaluation = (overrides?: Partial<ISupervisionEvaluation>): ISupervisionEvaluation => ({
  _id: 'e1',
  sessionId: 's1',
  groupId: 'g1',
  groupName: 'Group A',
  sessionSequence: 4,
  sessionStartsAt: '2026-03-10T10:00:00.000Z',
  teacherId: 't1',
  supervisorId: 'sv1',
  commitment: 5,
  teaching: 4,
  pedagogy: 3,
  contentAdherence: 2,
  technicalQuality: 1,
  notes: { general: 'Good pace.' },
  createdAt: '2026-03-11T00:00:00.000Z',
  ...overrides,
});

describe('EvaluationList', () => {
  it('says so when there is nothing yet', () => {
    render(<EvaluationList evaluations={[]} isLoading={false} />);
    expect(screen.getByText('supervision.empty')).toBeInTheDocument();
  });

  it('shows the loading state instead of the empty state while fetching', () => {
    render(<EvaluationList evaluations={[]} isLoading />);
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('supervision.empty')).not.toBeInTheDocument();
  });

  it('names the group and the session', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText(/#4/)).toBeInTheDocument();
  });

  it('shows every criterion with its score', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    for (const criterion of SUPERVISION_CRITERIA) {
      expect(screen.getByText(new RegExp(`supervision.criteria.${criterion}`))).toBeInTheDocument();
    }
  });

  it('shows a general note when there is one', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    expect(screen.getByText('Good pace.')).toBeInTheDocument();
  });

  it('is read-only: it offers no button', () => {
    render(<EvaluationList evaluations={[evaluation()]} isLoading={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
