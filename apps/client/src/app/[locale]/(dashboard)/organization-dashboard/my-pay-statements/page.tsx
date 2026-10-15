'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/atoms/input';
import { usePayStatements } from '@/lib/hooks/payroll/use-payroll.hook';
import { PayStatementsTable } from '@/components/organs/payroll/pay-statements-table';

export default function MyPayStatementsPage() {
  const t = useTranslations('Payroll');
  const [selectedMonth, setSelectedMonth] = useState('');

  const { data: statements, isLoading } = usePayStatements({
    month: selectedMonth || undefined,
  });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('myPayStatements')}</h1>
        <p className="text-muted-foreground text-sm">{t('myPayStatementsSubtitle')}</p>
      </div>

      <div className="flex items-center gap-3 bg-card p-4 rounded-lg border shadow-sm">
        <span className="text-sm font-medium">{t('month')}:</span>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-40"
        />
        {selectedMonth && (
          <button
            type="button"
            onClick={() => setSelectedMonth('')}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      <PayStatementsTable
        statements={statements ?? []}
        isLoading={isLoading}
        isInstructorView
      />
    </div>
  );
}
