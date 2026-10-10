'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import type { AiPlanResponse } from '@/lib/actions/ai-plan/ai-plan.action';
import type { AiSubscriptionFilters } from '@/lib/actions/ai-subscription/ai-subscription.action';

interface AiSubscriptionsFiltersProps {
  plans: AiPlanResponse[];
  filters: AiSubscriptionFilters;
  onChange: (filters: AiSubscriptionFilters) => void;
  onReset: () => void;
}

export function AiSubscriptionsFilters({
  plans,
  filters,
  onChange,
  onReset,
}: AiSubscriptionsFiltersProps) {
  const t = useTranslations('AdminAiSubscriptions');

  return (
    <div className="bg-muted/30 flex flex-wrap items-end gap-4 rounded-lg border p-4">
      <div className="min-w-[180px] space-y-1">
        <Label className="text-xs">{t('filters.plan')}</Label>
        <Select
          value={filters.aiPlanId ?? 'all'}
          onValueChange={(v) => onChange({ ...filters, aiPlanId: v === 'all' ? undefined : v })}>
          <SelectTrigger>
            <SelectValue placeholder={t('filters.allPlans')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allPlans')}</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p._id} value={p._id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[160px] space-y-1">
        <Label className="text-xs">{t('filters.createdAtFrom')}</Label>
        <Input
          type="date"
          value={filters.createdAtFrom ?? ''}
          onChange={(e) => onChange({ ...filters, createdAtFrom: e.target.value || undefined })}
        />
      </div>

      <div className="min-w-[160px] space-y-1">
        <Label className="text-xs">{t('filters.createdAtTo')}</Label>
        <Input
          type="date"
          value={filters.createdAtTo ?? ''}
          onChange={(e) => onChange({ ...filters, createdAtTo: e.target.value || undefined })}
        />
      </div>

      <Button variant="outline" size="sm" onClick={onReset}>
        {t('filters.reset')}
      </Button>
    </div>
  );
}
