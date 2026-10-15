import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Currency, LedgerEntryType } from '@darnozom/shared-types';
import { LedgerTable } from './ledger-table';
import type { ILedgerBalance, ILedgerEntry } from '@/lib/types/billing/billing';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vitest hoists vi.mock
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const ENTRY_CHARGE: ILedgerEntry = {
  _id: 'e1',
  organizationId: 'o1',
  familyId: 'f1',
  type: LedgerEntryType.CHARGE,
  amountMinor: 10_000,
  direction: 1,
  currency: Currency.EGP,
  description: 'charge.monthly',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

const ENTRY_PAYMENT: ILedgerEntry = {
  _id: 'e2',
  organizationId: 'o1',
  familyId: 'f1',
  type: LedgerEntryType.PAYMENT,
  amountMinor: 10_000,
  direction: -1,
  currency: Currency.EGP,
  description: 'entry.payment',
  createdAt: '2026-03-05T00:00:00.000Z',
  updatedAt: '2026-03-05T00:00:00.000Z',
};

describe('LedgerTable', () => {
  it('renders an empty state when there are no entries', () => {
    render(<LedgerTable entries={[]} balances={[]} isLoading={false} />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders a loading state when isLoading is true', () => {
    render(<LedgerTable entries={[]} balances={[]} isLoading />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders one row per entry with description and amount', () => {
    render(<LedgerTable entries={[ENTRY_CHARGE]} balances={[]} isLoading={false} />);
    expect(screen.getByText('charge.monthly')).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('visually distinguishes a charge and a payment', () => {
    render(<LedgerTable entries={[ENTRY_CHARGE, ENTRY_PAYMENT]} balances={[]} isLoading={false} />);
    const badges = screen.getAllByTestId('entry-type-badge');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('entry.charge');
    expect(badges[1]).toHaveTextContent('entry.payment');
    expect(badges[0]).not.toHaveClass(badges[1].className, { exact: true });
  });

  it('shows balance per currency with two currencies producing two balance lines', () => {
    const balances: ILedgerBalance[] = [
      { currency: Currency.EGP, chargedMinor: 10_000, paidMinor: 5000, balanceMinor: 5000 },
      { currency: Currency.USD, chargedMinor: 20_000, paidMinor: 0, balanceMinor: 20_000 },
    ];
    render(<LedgerTable entries={[ENTRY_CHARGE]} balances={balances} isLoading={false} />);
    const balanceRows = screen.getAllByTestId('balance-row');
    expect(balanceRows).toHaveLength(2);
    expect(balanceRows[0]).toHaveTextContent('EGP');
    expect(balanceRows[1]).toHaveTextContent('USD');
  });

  it('reads a zero balance as settled rather than blank', () => {
    const balances: ILedgerBalance[] = [
      { currency: Currency.EGP, chargedMinor: 10_000, paidMinor: 10_000, balanceMinor: 0 },
    ];
    render(
      <LedgerTable entries={[ENTRY_CHARGE, ENTRY_PAYMENT]} balances={balances} isLoading={false} />
    );
    expect(screen.getByText('settled')).toBeInTheDocument();
  });
});
