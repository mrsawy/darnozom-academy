import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SessionStatus } from '@darnozom/shared-types';
import { SessionDisputeModal } from './session-dispute-modal';
import type { ISession } from '@/lib/types/academics/academics';

const mockDisputeMutateAsync = vi.fn();
const mockResolveMutateAsync = vi.fn();

vi.mock('@/lib/hooks/payroll/use-payroll.hook', () => ({
  useDisputeSessionMutation: () => ({
    mutateAsync: mockDisputeMutateAsync,
    isPending: false,
  }),
  useResolveDisputeMutation: () => ({
    mutateAsync: mockResolveMutateAsync,
    isPending: false,
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const COMPLETED_SESSION: ISession = {
  _id: 'sess-1',
  groupId: 'grp-1',
  teacherId: 'teacher-1',
  sequence: 1,
  startsAt: '2026-10-10T10:00:00.000Z',
  endsAt: '2026-10-10T11:00:00.000Z',
  status: SessionStatus.COMPLETED,
  attendance: [],
};

const DISPUTED_SESSION: ISession = {
  ...COMPLETED_SESSION,
  _id: 'sess-2',
  disputed: true,
  disputeReason: 'Teacher absent without notice',
  disputedAt: '2026-10-11T12:00:00.000Z',
};

describe('SessionDisputeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when session is null', () => {
    const { container } = render(
      <SessionDisputeModal open onOpenChange={vi.fn()} session={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders dispute form when session is not disputed and submits reason', async () => {
    const onOpenChange = vi.fn();
    mockDisputeMutateAsync.mockResolvedValue({});

    render(
      <SessionDisputeModal open onOpenChange={onOpenChange} session={COMPLETED_SESSION} />
    );

    expect(screen.getByText('disputeTitle')).toBeInTheDocument();
    expect(screen.getByText('disputeReason')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('disputeReasonPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Late start' } });

    const submitBtn = screen.getByRole('button', { name: 'dispute' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockDisputeMutateAsync).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      reason: 'Late start',
    });
  });

  it('renders dispute reason and resolve button when session is disputed', () => {
    const onOpenChange = vi.fn();
    mockResolveMutateAsync.mockResolvedValue({});

    render(
      <SessionDisputeModal open onOpenChange={onOpenChange} session={DISPUTED_SESSION} />
    );

    expect(screen.getByText('disputedBadge')).toBeInTheDocument();
    expect(screen.getByText('Teacher absent without notice')).toBeInTheDocument();

    const resolveBtn = screen.getByRole('button', { name: 'resolveDispute' });
    fireEvent.click(resolveBtn);

    expect(mockResolveMutateAsync).toHaveBeenCalledWith('sess-2');
  });
});
