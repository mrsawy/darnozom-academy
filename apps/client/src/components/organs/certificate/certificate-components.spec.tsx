import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CertificateStatus } from '@darnozom/shared-types';
import type { ICertificate } from '@darnozom/shared-types';
import { CertificateCard } from './certificate-card';
import { CertificateNameReviewModal } from './certificate-name-review-modal';
import { LevelCertificateRulesModal } from './level-certificate-rules-modal';
import { GroupCertificatesCard } from './group-certificates-card';
import type { IGroupDetail } from '@/lib/types/academics/academics';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'en',
}));

vi.mock('@/lib/hooks/certificate/use-certificate.hook', () => ({
  useCertificates: vi.fn(() => ({ data: [], isLoading: false })),
  useEvaluateCertificates: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useIssueCertificate: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateCertificateName: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useConfirmCertificateName: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/lib/hooks/academics/use-academics.hook', () => ({
  useUpdateLevel: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const mockCert: ICertificate = {
  _id: 'cert-1',
  organizationId: 'org-1',
  courseId: 'course-1',
  levelId: 'level-1',
  groupId: 'group-1',
  studentId: 'student-1',
  status: CertificateStatus.NAME_REVIEW,
  nameAr: 'أحمد علي',
  nameEn: 'Ahmed Ali',
  eligibility: {
    attendancePercent: 90,
    homeworkAverage: 4.5,
    examPassed: true,
    fullyPaid: true,
    isEligible: true,
    rulesSnapshot: {
      minAttendancePercent: 80,
      minHomeworkAverage: 3.5,
      requireExamPass: true,
      requireFullyPaid: true,
    },
  },
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

const mockGroup: IGroupDetail = {
  _id: 'group-1',
  cohortId: 'cohort-1',
  levelId: 'level-1',
  courseId: 'course-1',
  name: 'Group Alpha',
  teacherId: 'teacher-1',
  coordinatorId: null,
  supervisorId: null,
  schedule: [],
  timezone: 'UTC',
  minStudents: 5,
  maxStudents: 15,
  contentSent: { done: true },
  students: [],
  status: 'COMPLETED' as any,
  readiness: { ready: true } as any,
  atRisk: false,
  atRiskSince: null,
  atRiskReason: null,
  people: { 'student-1': 'Ahmed Ali' },
};

describe('Certificate Components', () => {
  describe('CertificateCard', () => {
    it('renders certificate details and student name', () => {
      render(<CertificateCard certificate={mockCert} />);
      expect(screen.getByText('أحمد علي')).toBeInTheDocument();
      expect(screen.getByText('Ahmed Ali')).toBeInTheDocument();
      expect(screen.getByText('status.NAME_REVIEW')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('4.5/5')).toBeInTheDocument();
    });

    it('displays issued badge and serial when status is ISSUED', () => {
      const issuedCert: ICertificate = {
        ...mockCert,
        status: CertificateStatus.ISSUED,
        serial: 'NOZOM-2026-000001',
        issuedAt: '2026-10-15T12:00:00.000Z',
      };

      render(<CertificateCard certificate={issuedCert} />);
      expect(screen.getByText('status.ISSUED')).toBeInTheDocument();
      expect(screen.getByText('NOZOM-2026-000001')).toBeInTheDocument();
      expect(screen.getByText('card.viewCertificate')).toBeInTheDocument();
    });
  });

  describe('CertificateNameReviewModal', () => {
    it('renders input fields for Arabic and English names', () => {
      render(
        <CertificateNameReviewModal
          certificate={mockCert}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText('nameReview.title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('أحمد علي')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Ahmed Ali')).toBeInTheDocument();
      expect(screen.getByText('nameReview.confirmButton')).toBeInTheDocument();
    });
  });

  describe('LevelCertificateRulesModal', () => {
    it('renders inputs for certificate rules and saves', () => {
      render(
        <LevelCertificateRulesModal
          levelId="level-1"
          levelName="Level 1"
          rules={{
            minAttendancePercent: 85,
            minHomeworkAverage: 4.0,
            requireExamPass: true,
            requireFullyPaid: true,
          }}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText('rules.title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('85')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    });
  });

  describe('GroupCertificatesCard', () => {
    it('renders empty state when no certificates', () => {
      render(<GroupCertificatesCard group={mockGroup} canManage={true} />);
      expect(screen.getByText('groupTab.title')).toBeInTheDocument();
      expect(screen.getByText('groupTab.empty')).toBeInTheDocument();
    });
  });
});
