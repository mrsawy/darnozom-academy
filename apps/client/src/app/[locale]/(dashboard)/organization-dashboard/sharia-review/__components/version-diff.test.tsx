import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionDiff } from './version-diff';

const mockTranslate = (key: string) => key;

vi.mock('next-intl', () => ({
  useTranslations: () => mockTranslate,
}));

describe('VersionDiff', () => {
  it('shows the live value beside the proposed one for each changed field', () => {
    render(<VersionDiff live={{ title: 'Old title' }} pending={{ title: 'New title' }} />);
    expect(screen.getByText('Old title')).toBeInTheDocument();
    expect(screen.getByText('New title')).toBeInTheDocument();
  });

  it('shows only the fields the edit touches', () => {
    render(
      <VersionDiff live={{ title: 'Old', body: 'Unchanged body' }} pending={{ title: 'New' }} />
    );
    expect(screen.queryByText('Unchanged body')).not.toBeInTheDocument();
  });

  it('marks a field the live content does not have yet', () => {
    render(<VersionDiff live={{}} pending={{ title: 'Brand new' }} />);
    expect(screen.getByText('sharia.notSet')).toBeInTheDocument();
    expect(screen.getByText('Brand new')).toBeInTheDocument();
  });

  it('renders an object value as readable JSON rather than [object Object]', () => {
    render(<VersionDiff live={{}} pending={{ settings: { downloadEnabled: true } }} />);
    expect(screen.getByText(/downloadEnabled/)).toBeInTheDocument();
  });
});
