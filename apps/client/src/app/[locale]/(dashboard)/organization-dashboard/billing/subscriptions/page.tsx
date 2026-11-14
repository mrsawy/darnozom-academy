'use client';

import { useDeferredValue, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BillingSubscriptionStatus, SubscriptionType } from '@darnozom/shared-types';
import { Card, CardContent } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';
import { useAllSubscriptions } from '@/lib/hooks/billing/use-billing.hook';
import { formatMoney } from '@/lib/utils/billing/format-money';
import type { ListSubscriptionsQuery } from '@/lib/types/billing/billing';
import { SubscriptionsTable } from './__components/subscriptions-table';

const ALL = 'ALL';
type Holder = typeof ALL | 'PARENT' | 'STUDENT';

export default function AccountingSubscriptionsPage() {
  const t = useTranslations('Accounting.subscriptions');
  const tBilling = useTranslations('Billing');
  const locale = useLocale();

  const [holder, setHolder] = useState<Holder>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [groupId, setGroupId] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const query: ListSubscriptionsQuery = {
    holder: holder === ALL ? undefined : holder,
    status: status === ALL ? undefined : (status as BillingSubscriptionStatus),
    type: type === ALL ? undefined : (type as SubscriptionType),
    groupId: groupId === ALL ? undefined : groupId,
    search: deferredSearch.trim() || undefined,
  };

  const { data, isLoading } = useAllSubscriptions(query);
  const { data: groups = [] } = useGroups({});

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      {/* One card per currency: amounts in different currencies are never added together. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.totals ?? []).map((total) => (
          <Card key={total.currency}>
            <CardContent className="space-y-3 pt-6">
              <div className="text-muted-foreground text-xs font-medium">{total.currency}</div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label={t('summary.active')} value={String(total.activeCount)} />
                <Stat
                  label={t('summary.billed')}
                  value={formatMoney(total.activeAmountMinor, total.currency, locale)}
                />
                <Stat
                  label={t('summary.outstanding')}
                  value={formatMoney(total.outstandingMinor, total.currency, locale)}
                  danger={total.outstandingMinor > 0}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card space-y-3 rounded-lg border p-4 shadow-sm">
        <Tabs value={holder} onValueChange={(v) => setHolder(v as Holder)}>
          <TabsList>
            {([ALL, 'PARENT', 'STUDENT'] as const).map((h) => (
              <TabsTrigger key={h} value={h}>
                {t(`payers.${h}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-64"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allStatuses')}</SelectItem>
              <SelectItem value={BillingSubscriptionStatus.ACTIVE}>{tBilling('active')}</SelectItem>
              <SelectItem value={BillingSubscriptionStatus.ENDED}>{tBilling('ended')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allTypes')}</SelectItem>
              {Object.values(SubscriptionType).map((s) => (
                <SelectItem key={s} value={s}>
                  {tBilling(`type.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allGroups')}</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g._id} value={g._id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <SubscriptionsTable rows={data?.rows ?? []} isLoading={isLoading} />
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`font-mono text-lg font-semibold ${danger ? 'text-destructive' : ''}`}>
        {value}
      </div>
    </div>
  );
}
