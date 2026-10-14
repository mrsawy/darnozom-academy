import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShariaStatus } from '@darnozom/shared-types';
import { ShariaStatusBadge } from './sharia-status-badge';

const mockTranslate = (key: string) => key;

vi.mock('next-intl', () => ({ useTranslations: () => mockTranslate }));

describe('ShariaStatusBadge', () => {
  it('names each state', () => {
    for (const status of Object.values(ShariaStatus)) {
      const { unmount } = render(<ShariaStatusBadge status={status} reviewComment={null} />);
      expect(screen.getByText(`sharia.status.${status}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('shows the rejection reason, which is the whole point of a rejection', () => {
    render(<ShariaStatusBadge status={ShariaStatus.REJECTED} reviewComment="Needs a source." />);
    expect(screen.getByText('Needs a source.')).toBeInTheDocument();
  });

  it('shows no comment when there is none', () => {
    render(<ShariaStatusBadge status={ShariaStatus.APPROVED} reviewComment={null} />);
    expect(screen.queryByText('Needs a source.')).not.toBeInTheDocument();
  });
});
