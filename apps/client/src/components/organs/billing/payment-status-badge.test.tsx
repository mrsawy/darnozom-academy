import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentStatusBadge } from './payment-status-badge';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vitest hoists vi.mock
  useTranslations: () => (key: string) => key,
}));

describe('PaymentStatusBadge', () => {
  it('renders the under-review label for UNDER_REVIEW', () => {
    render(<PaymentStatusBadge status="UNDER_REVIEW" />);
    expect(screen.getByText('status.UNDER_REVIEW')).toBeInTheDocument();
  });

  it('renders paid as before', () => {
    render(<PaymentStatusBadge status="PAID" />);
    expect(screen.getByText('status.PAID')).toBeInTheDocument();
  });

  it('renders unpaid as before', () => {
    render(<PaymentStatusBadge status="UNPAID" />);
    expect(screen.getByText('status.UNPAID')).toBeInTheDocument();
  });
});
