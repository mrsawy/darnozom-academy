'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useStatement } from '@/lib/hooks/billing/use-billing.hook';
import { LedgerTable } from '@/components/organs/billing/ledger-table';

export default function FamilyLedgerPage() {
  const t = useTranslations('Billing');
  const params = useParams<{ familyId: string }>();
  const familyId = params?.familyId ?? '';
  const { data: statement, isLoading } = useStatement(familyId);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('ledger')}</h1>
        <p className="text-muted-foreground text-sm">{familyId}</p>
      </div>

      <LedgerTable
        entries={statement?.entries ?? []}
        balances={statement?.balances ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
