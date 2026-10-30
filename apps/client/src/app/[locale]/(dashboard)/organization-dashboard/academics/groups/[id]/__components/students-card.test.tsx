import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupPaymentStatus, GroupStatus, GroupStudentStatus } from '@darnozom/shared-types';
import { StudentsCard } from './students-card';
import type { IGroupDetail } from '@/lib/types/academics/academics';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/lib/hooks/academics/use-academics.hook', () => ({
  useAddStudent: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveStudent: () => ({ mutate: vi.fn(), isPending: false }),
  useSetWhatsapp: () => ({ mutate: vi.fn(), isPending: false }),
  useStudentCandidates: () => ({ data: [] }),
}));

vi.mock('@/lib/hooks/certificate/use-certificate.hook', () => ({
  useSetFinalResultMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('./student-detail-dialog', () => ({
  StudentDetailDialog: () => null,
}));

const group = (paymentStatus: GroupPaymentStatus): IGroupDetail => ({
  _id: 'g1',
  cohortId: 'c1',
  levelId: 'l1',
  courseId: 'co1',
  name: 'Group 1',
  teacherId: null,
  coordinatorId: null,
  supervisorId: null,
  schedule: [],
  timezone: 'UTC',
  minStudents: 1,
  maxStudents: 10,
  contentSent: { done: false },
  students: [
    { studentId: 's1', paymentStatus, whatsappAdded: false, addedAt: '2026-01-01', status: GroupStudentStatus.ACTIVE },
  ],
  status: GroupStatus.FORMING,
  readiness: { ready: false, items: [] },
  atRisk: false,
  atRiskSince: null,
  atRiskReason: null,
  people: { s1: 'Student One' },
});

describe('StudentsCard payment status', () => {
  it('shows UNDER_REVIEW for a student with a pending manual-transfer payment', () => {
    render(<StudentsCard group={group(GroupPaymentStatus.UNDER_REVIEW)} disabled={false} />);
    expect(screen.getByText('status.UNDER_REVIEW')).toBeInTheDocument();
  });

  it('still shows PAID as before', () => {
    render(<StudentsCard group={group(GroupPaymentStatus.PAID)} disabled={false} />);
    expect(screen.getByText('status.PAID')).toBeInTheDocument();
  });
});
