'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BillingCycle } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/atoms/alert-dialog';
import { useAdminPlans } from '@/lib/hooks/admin-plans/use-admin-plans.hook';
import {
  useCancelOrganizationSubscription,
  useSetOrganizationPlan,
  useSuspendOrganizationSubscription,
  useUpdateOrganizationSubscription,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type {
  IAdminOrganizationDetails,
  IAdminSubscriptionSummary,
} from '@/lib/types/admin-review/admin-review.interface';

type SubscriptionUsageKey = keyof NonNullable<IAdminSubscriptionSummary['usage']>;

const USAGE_LIMIT_ROWS: {
  usageKey: SubscriptionUsageKey;
  featureKey: string;
  labelKey: string;
}[] = [
  { usageKey: 'usersUsed', featureKey: 'usersPerSubscription', labelKey: 'users' },
  { usageKey: 'coursesUsed', featureKey: 'coursesPerSubscription', labelKey: 'courses' },
  { usageKey: 'pagesUsed', featureKey: 'pagesPerSubscription', labelKey: 'pages' },
  { usageKey: 'parentUsersUsed', featureKey: 'parentAccountsPerSubscription', labelKey: 'parents' },
  { usageKey: 'storageUsedGB', featureKey: 'maxStorageGB', labelKey: 'storage' },
  { usageKey: 'liveSessionsUsed', featureKey: 'liveSessionsPerMonth', labelKey: 'liveSessions' },
  { usageKey: 'assignmentsUsed', featureKey: 'assignmentsPerMonth', labelKey: 'assignments' },
];

function formatLimit(limit: unknown): string {
  if (typeof limit !== 'number') return '—';
  if (limit < 0) return '∞';
  return String(limit);
}

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

interface OrgPlanSectionProps {
  org: IAdminOrganizationDetails;
}

export function OrgPlanSection({ org }: OrgPlanSectionProps) {
  const t = useTranslations('AdminDashboard');
  const { data: plans = [] } = useAdminPlans();
  const setPlan = useSetOrganizationPlan(org._id);
  const updatePeriod = useUpdateOrganizationSubscription(org._id);
  const suspendSub = useSuspendOrganizationSubscription(org._id);
  const cancelSub = useCancelOrganizationSubscription(org._id);

  const [changeOpen, setChangeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [planId, setPlanId] = useState(org.plan?._id ?? '');
  const [billingCycle, setBillingCycle] = useState(
    org.subscription?.billingCycle ?? BillingCycle.MONTHLY
  );
  const [endsAt, setEndsAt] = useState(toDateInputValue(org.subscription?.endsAt));
  const [nextBillingAt, setNextBillingAt] = useState(
    toDateInputValue(org.subscription?.nextBillingAt)
  );

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);

  const statusLabel = org.subscription?.status
    ? t(`orgPlan.subscriptionStatus.${org.subscription.status}` as never)
    : t('orgPlan.noSubscription');

  const openChangePlan = () => {
    setPlanId(org.plan?._id ?? activePlans[0]?._id ?? '');
    setBillingCycle(org.subscription?.billingCycle ?? BillingCycle.MONTHLY);
    setEndsAt(toDateInputValue(org.subscription?.endsAt));
    setChangeOpen(true);
  };

  const openEditPeriod = () => {
    setBillingCycle(org.subscription?.billingCycle ?? BillingCycle.MONTHLY);
    setEndsAt(toDateInputValue(org.subscription?.endsAt));
    setNextBillingAt(toDateInputValue(org.subscription?.nextBillingAt));
    setEditOpen(true);
  };

  const pending =
    setPlan.isPending || updatePeriod.isPending || suspendSub.isPending || cancelSub.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">{t('orgPlan.title')}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">{t('orgPlan.description')}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={openChangePlan} disabled={pending}>
            {t('orgPlan.actions.changePlan')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={openEditPeriod}
            disabled={pending || !org.subscription}>
            {t('orgPlan.actions.editPeriod')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={pending || !org.subscription}>
                {t('orgPlan.actions.suspendSubscription')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('orgPlan.confirmSuspend.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('orgPlan.confirmSuspend.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('confirmDelete.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => suspendSub.mutate()}>
                  {t('orgPlan.confirmSuspend.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={pending || !org.subscription}>
                {t('orgPlan.actions.cancelSubscription')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('orgPlan.confirmCancel.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('orgPlan.confirmCancel.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('confirmDelete.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => cancelSub.mutate()}>
                  {t('orgPlan.confirmCancel.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">{t('table.plan')}</p>
            <p className="font-medium">{org.plan?.name ?? org.planName ?? '—'}</p>
            {org.plan?.tier ? (
              <p className="text-muted-foreground text-xs">
                {t('orgPlan.tier')}: {org.plan.tier}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t('table.subscriptionStatus')}</p>
            <p className="font-medium">{statusLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t('orgPlan.billingCycle')}</p>
            <p className="font-medium">
              {org.subscription?.billingCycle
                ? t(`orgPlan.billingCycles.${org.subscription.billingCycle}` as never)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t('orgPlan.dates')}</p>
            <p className="text-sm">
              {t('orgPlan.startsAt')}:{' '}
              {org.subscription?.startsAt
                ? new Date(org.subscription.startsAt).toLocaleDateString()
                : '—'}
            </p>
            <p className="text-sm">
              {t('orgPlan.endsAt')}:{' '}
              {org.subscription?.endsAt
                ? new Date(org.subscription.endsAt).toLocaleDateString()
                : '—'}
            </p>
            <p className="text-sm">
              {t('orgPlan.nextBillingAt')}:{' '}
              {org.subscription?.nextBillingAt
                ? new Date(org.subscription.nextBillingAt).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>

        {org.subscription?.usage ? (
          <div>
            <p className="mb-2 text-sm font-medium">{t('orgPlan.usageTitle')}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {USAGE_LIMIT_ROWS.map((row) => {
                const used = org.subscription?.usage?.[row.usageKey] ?? 0;
                const limit = org.plan?.features?.[row.featureKey];
                return (
                  <div key={row.usageKey} className="rounded-md border px-3 py-2 text-sm">
                    <p className="text-muted-foreground text-xs">
                      {t(`orgPlan.usage.${row.labelKey}` as never)}
                    </p>
                    <p className="font-medium">
                      {used} / {formatLimit(limit)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orgPlan.changePlanDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('table.plan')}</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('orgPlan.changePlanDialog.selectPlan')} />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan._id} value={plan._id}>
                      {plan.name} ({plan.tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('orgPlan.billingCycle')}</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BillingCycle).map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {t(`orgPlan.billingCycles.${cycle}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('orgPlan.endsAt')}</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button
              disabled={!planId || setPlan.isPending}
              onClick={() => {
                setPlan.mutate(
                  {
                    planId,
                    billingCycle,
                    endsAt: fromDateInputValue(endsAt),
                  },
                  { onSuccess: () => setChangeOpen(false) }
                );
              }}>
              {t('orgPlan.changePlanDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orgPlan.editPeriodDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('orgPlan.billingCycle')}</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BillingCycle).map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {t(`orgPlan.billingCycles.${cycle}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('orgPlan.endsAt')}</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('orgPlan.nextBillingAt')}</Label>
              <Input
                type="date"
                value={nextBillingAt}
                onChange={(e) => setNextBillingAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button
              disabled={updatePeriod.isPending}
              onClick={() => {
                updatePeriod.mutate(
                  {
                    billingCycle,
                    endsAt: fromDateInputValue(endsAt),
                    nextBillingAt: fromDateInputValue(nextBillingAt),
                  },
                  { onSuccess: () => setEditOpen(false) }
                );
              }}>
              {t('orgPlan.editPeriodDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
