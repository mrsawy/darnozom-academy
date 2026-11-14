'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PayStatementStatus, type Currency } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import {
  useApprovePayStatement,
  useGeneratePayStatements,
  useGroupPayRules,
  usePayrollLookup,
  usePayStatements,
  useRemoveGroupPayRule,
} from '@/lib/hooks/payroll/use-payroll.hook';
import { AddBonusDialog } from '@/components/organs/payroll/add-bonus-dialog';
import { GroupPayRuleDialog } from '@/components/organs/payroll/group-pay-rule-dialog/group-pay-rule-dialog';
import { GroupPayRulesTable } from '@/components/organs/payroll/group-pay-rules-table';
import { GroupPayrollTable } from '@/components/organs/payroll/group-payroll-table';
import { MarkPaidDialog } from '@/components/organs/payroll/mark-paid-dialog';
import { PayStatementsTable } from '@/components/organs/payroll/pay-statements-table';
import { formatPayrollAmount } from '@/lib/utils/payroll/format-payroll';
import type { IGroupPayRule, IPayStatement } from '@/lib/types/payroll/payroll';

type View = 'byTeacher' | 'byGroup';

export default function AccountantSalariesPage() {
  const t = useTranslations('Payroll');
  const locale = useLocale();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [view, setView] = useState<View>('byTeacher');

  const { data: statements = [], isLoading: isLoadingStatements } = usePayStatements({
    month: selectedMonth || undefined,
    status: selectedStatus === 'ALL' ? undefined : (selectedStatus as PayStatementStatus),
  });
  const generateStatements = useGeneratePayStatements();
  const approveStatement = useApprovePayStatement();

  const { data: lookup } = usePayrollLookup();
  const { data: rules = [], isLoading: isLoadingRules } = useGroupPayRules();
  const removeRule = useRemoveGroupPayRule();

  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IGroupPayRule | null>(null);
  const [bonusStatement, setBonusStatement] = useState<IPayStatement | null>(null);
  const [paidStatement, setPaidStatement] = useState<IPayStatement | null>(null);

  const teacherNames = useMemo(
    () => Object.fromEntries((lookup?.teachers ?? []).map((x) => [x.id, x.name])),
    [lookup]
  );

  // Per currency: payroll in different currencies is never added together.
  const summary = useMemo(() => {
    const byCurrency = new Map<Currency, { total: number; collected: number }>();
    const counts = { teachers: new Set<string>(), groups: new Set<string>() };
    const statuses = { DRAFT: 0, APPROVED: 0, PAID: 0 };
    for (const s of statements) {
      const currency = s.currency ?? s.profileSnapshot?.currency;
      if (currency) {
        const current = byCurrency.get(currency) ?? { total: 0, collected: 0 };
        current.total += s.total;
        current.collected += s.basis.revenue;
        byCurrency.set(currency, current);
      }
      counts.teachers.add(s.teacherId);
      for (const line of s.lines ?? []) counts.groups.add(line.groupId);
      statuses[s.status] += 1;
    }
    return { byCurrency, counts, statuses };
  }, [statements]);

  const openRuleDialog = (rule: IGroupPayRule | null) => {
    setEditingRule(rule);
    setRuleDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="payroll" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payroll">{t('tabs.payroll')}</TabsTrigger>
          <TabsTrigger value="rules">{t('tabs.rules')}</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-4">
          <div className="bg-card flex flex-col gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('month')}:</span>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('status')}:</span>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('allStatuses')}</SelectItem>
                    {Object.values(PayStatementStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`statuses.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList>
                  <TabsTrigger value="byTeacher">{t('views.byTeacher')}</TabsTrigger>
                  <TabsTrigger value="byGroup">{t('views.byGroup')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Button
              onClick={() => selectedMonth && generateStatements.mutate(selectedMonth)}
              disabled={generateStatements.isPending || !selectedMonth}>
              {t('generateStatements')}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={t('summary.totalPayable')}>
              {summary.byCurrency.size === 0
                ? '—'
                : [...summary.byCurrency.entries()].map(([currency, v]) => (
                    <div key={currency} className="font-mono text-xl font-semibold">
                      {formatPayrollAmount(v.total, currency, locale)}
                    </div>
                  ))}
            </SummaryCard>
            <SummaryCard label={t('summary.collected')}>
              {summary.byCurrency.size === 0
                ? '—'
                : [...summary.byCurrency.entries()].map(([currency, v]) => (
                    <div key={currency} className="font-mono text-xl font-semibold">
                      {formatPayrollAmount(v.collected, currency, locale)}
                    </div>
                  ))}
            </SummaryCard>
            <SummaryCard label={`${t('summary.teachers')} / ${t('summary.groups')}`}>
              <div className="font-mono text-xl font-semibold">
                {summary.counts.teachers.size} / {summary.counts.groups.size}
              </div>
            </SummaryCard>
            <SummaryCard label={t('status')}>
              <div className="flex gap-3 text-sm">
                <span>
                  {t('summary.draft')}: <b>{summary.statuses.DRAFT}</b>
                </span>
                <span>
                  {t('summary.approved')}: <b>{summary.statuses.APPROVED}</b>
                </span>
                <span>
                  {t('summary.paid')}: <b>{summary.statuses.PAID}</b>
                </span>
              </div>
            </SummaryCard>
          </div>

          {view === 'byTeacher' ? (
            <PayStatementsTable
              statements={statements}
              isLoading={isLoadingStatements}
              teacherNames={teacherNames}
              onAddBonus={(s) => setBonusStatement(s)}
              onApprove={(id) => approveStatement.mutate(id)}
              onMarkPaid={(s) => setPaidStatement(s)}
            />
          ) : (
            <GroupPayrollTable
              statements={statements}
              teacherNames={teacherNames}
              isLoading={isLoadingStatements}
            />
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('rulesTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('rulesSubtitle')}</p>
            </div>
            <Button onClick={() => openRuleDialog(null)}>{t('addRule')}</Button>
          </div>

          <GroupPayRulesTable
            rules={rules}
            lookup={lookup}
            isLoading={isLoadingRules}
            onEdit={openRuleDialog}
            onRemove={(rule) => removeRule.mutate(rule._id)}
          />
        </TabsContent>
      </Tabs>

      <GroupPayRuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        lookup={lookup}
        rule={editingRule}
      />

      <AddBonusDialog
        open={Boolean(bonusStatement)}
        onOpenChange={(open) => !open && setBonusStatement(null)}
        statement={bonusStatement}
      />

      <MarkPaidDialog
        open={Boolean(paidStatement)}
        onOpenChange={(open) => !open && setPaidStatement(null)}
        statement={paidStatement}
      />
    </div>
  );
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <div className="text-muted-foreground text-xs font-medium">{label}</div>
        {children}
      </CardContent>
    </Card>
  );
}
