'use client';

import { LoadingState } from '@/components/atoms/loading-state';
import { useLocale, useTranslations } from 'next-intl';
import { GroupPayModel } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { formatPayrollAmount } from '@/lib/utils/payroll/format-payroll';
import type { IGroupPayRule, IPayrollLookup } from '@/lib/types/payroll/payroll';

export interface GroupPayRulesTableProps {
  rules: IGroupPayRule[];
  lookup?: IPayrollLookup;
  isLoading?: boolean;
  onEdit: (rule: IGroupPayRule) => void;
  onRemove: (rule: IGroupPayRule) => void;
}

/** Pay rules grouped by teacher, so an accountant reads one teacher's whole arrangement together. */
export function GroupPayRulesTable({
  rules,
  lookup,
  isLoading,
  onEdit,
  onRemove,
}: GroupPayRulesTableProps) {
  const t = useTranslations('Payroll');
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <LoadingState />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('noRules')}</p>
      </div>
    );
  }

  const teacherName = (id: string) =>
    lookup?.teachers.find((x) => x.id === id)?.name ?? t('unknownTeacher');
  const groupName = (id: string) => lookup?.groups.find((g) => g.id === id)?.name ?? id;

  const sorted = rules.toSorted((a, b) =>
    teacherName(a.teacherId).localeCompare(teacherName(b.teacherId), locale)
  );

  const describe = (rule: IGroupPayRule) =>
    rule.model === GroupPayModel.PERCENT_OF_SUBSCRIPTIONS
      ? t('ruleValue.PERCENT_OF_SUBSCRIPTIONS', { rate: rule.rate })
      : t(`ruleValue.${rule.model}`, {
          amount: formatPayrollAmount(rule.rate, rule.currency, locale),
        });

  return (
    <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('teacher')}</TableHead>
            <TableHead>{t('group')}</TableHead>
            <TableHead>{t('payModel')}</TableHead>
            <TableHead>{t('rule')}</TableHead>
            <TableHead>{t('effectiveFrom')}</TableHead>
            <TableHead className="text-end">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((rule, index) => {
            const firstOfTeacher = index === 0 || sorted[index - 1].teacherId !== rule.teacherId;
            return (
              <TableRow key={rule._id} className={firstOfTeacher ? 'border-t-2' : undefined}>
                <TableCell className="font-medium">
                  {firstOfTeacher ? teacherName(rule.teacherId) : null}
                </TableCell>
                <TableCell>{groupName(rule.groupId)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {t(`groupModels.${rule.model}`)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono whitespace-nowrap">{describe(rule)}</TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {new Date(rule.effectiveFrom).toLocaleDateString(locale)}
                </TableCell>
                <TableCell className="text-end whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(rule)}>
                      {t('editRule')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRemove(rule)}>
                      {t('removeRule')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
