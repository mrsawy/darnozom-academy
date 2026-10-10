'use client';

import { useTranslations } from 'next-intl';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import type { PlanResponse } from '@/lib/actions/plan/plan.action';

interface PlansTableProps {
  plans: PlanResponse[];
  onEdit: (plan: PlanResponse) => void;
  onDelete: (plan: PlanResponse) => void;
}

export function PlansTable({ plans, onEdit, onDelete }: PlansTableProps) {
  const t = useTranslations('AdminPlans');

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t('table.name')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.tier')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.monthlyPrice')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.yearlyPrice')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.active')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan._id} className="hover:bg-muted/30 border-b last:border-0">
              <td className="px-4 py-3 font-medium">{plan.name}</td>
              <td className="px-4 py-3">
                <Badge variant="outline">{plan.tier}</Badge>
              </td>
              <td className="px-4 py-3">${plan.price?.MONTHLY?.priceUSD ?? 0}</td>
              <td className="px-4 py-3">${plan.price?.YEARLY?.priceUSD ?? 0}</td>
              <td className="px-4 py-3">
                <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                  {plan.isActive ? t('badges.active') : t('badges.inactive')}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(plan)}
                    aria-label={t('editAriaLabel')}>
                    <IconPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(plan)}
                    aria-label={t('deleteAriaLabel')}>
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
