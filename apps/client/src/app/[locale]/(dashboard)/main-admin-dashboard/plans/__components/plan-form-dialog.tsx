'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/atoms/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { PlanTier, BillingCycle, CURRENCIES } from '@darnozom/shared-types';
import {
  planFormSchema,
  defaultPlanFormValues,
  defaultPlanFeatures,
  type PlanFormValues,
} from './plan-form.schema';
import type { PlanResponse } from '@/lib/actions/plan/plan.action';

const PLAN_TIERS = Object.values(PlanTier);

const BOOLEAN_FEATURES = [
  'courseAnalytics',
  'contentAnalytics',
  'moduleAnalytics',
  'trackingStudentProgress',
  'prioritySupport',
  'accessStudentsInfo',
  'certificates',
  'customBranding',
  'inAppChat',
  'liveSessions',
  'quizzes',
  'assignments',
  'bulkExport',
  'apiAccess',
  'whiteLabel',
  'customDomain',
  'sso',
  'attendanceTracking',
  'dripContent',
  'gamification',
  'webhooks',
  'reporting',
  'courseTemplates',
  'multiLanguage',
] as const;

const NUMERIC_FEATURES = [
  'usersPerSubscription',
  'coursesPerSubscription',
  'parentAccountsPerSubscription',
  'pagesPerSubscription',
  'liveSessionsPerMonth',
  'assignmentsPerMonth',
  'maxStorageGB',
] as const;

const BILLING_CYCLES = Object.values(BillingCycle);

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: PlanResponse | null;
  onSubmit: (values: PlanFormValues) => void;
  isSubmitting: boolean;
}

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  onSubmit,
  isSubmitting,
}: PlanFormDialogProps) {
  const t = useTranslations('AdminPlans');
  const isEdit = !!plan;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: yupResolver(planFormSchema),
    defaultValues: defaultPlanFormValues,
  });

  useEffect(() => {
    if (open) {
      if (plan) {
        reset({
          name: plan.name,
          description: plan.description,
          tier: plan.tier,
          isActive: plan.isActive,
          price: {
            MONTHLY: plan.price.MONTHLY,
            YEARLY: plan.price.YEARLY,
            ONE_TIME: plan.price.ONE_TIME,
          },
          // Spread defaults first so any feature added after the plan was created
          // gets a safe false value instead of undefined (which would fail validation).
          features: {
            ...defaultPlanFeatures,
            ...(plan.features as PlanFormValues['features']),
          },
        });
      } else {
        reset(defaultPlanFormValues);
      }
    }
  }, [open, plan, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editPlan') : t('createPlan')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
          {/* ─── Basic Info ─── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="plan-name">{t('form.name')}</Label>
              <Input id="plan-name" placeholder={t('form.namePlaceholder')} {...register('name')} />
              {errors.name ? (
                <p className="text-destructive text-xs">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>{t('form.tier')}</Label>
              <Controller
                name="tier"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('form.selectTier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tier ? (
                <p className="text-destructive text-xs">{errors.tier.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="plan-description">{t('form.description')}</Label>
            <Input
              id="plan-description"
              placeholder={t('form.descriptionPlaceholder')}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch id="plan-isActive" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="plan-isActive">{t('form.isActive')}</Label>
          </div>

          {/* ─── Pricing ─── */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('form.pricing')}</h3>
            {BILLING_CYCLES.map((cycle) => (
              <div key={cycle} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">
                  {t(
                    cycle === BillingCycle.MONTHLY
                      ? 'form.monthlySection'
                      : cycle === BillingCycle.YEARLY
                        ? 'form.yearlySection'
                        : 'form.oneTimeSection'
                  )}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('form.originalPrice')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`price.${cycle}.originalPrice`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('form.originalCurrency')}</Label>
                    <Controller
                      name={`price.${cycle}.originalCurrency`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('form.priceUSD')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`price.${cycle}.priceUSD`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Numeric Feature Limits ─── */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('form.limits')}</h3>
            <p className="text-muted-foreground text-xs">{t('form.unlimited')}</p>
            <div className="grid grid-cols-2 gap-3">
              {NUMERIC_FEATURES.map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{t(`form.${key}`)}</Label>
                  <Input
                    type="number"
                    min="-1"
                    {...register(`features.${key}`, { valueAsNumber: true })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ─── Boolean Feature Toggles ─── */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('form.featureToggles')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {BOOLEAN_FEATURES.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Controller
                    name={`features.${key}`}
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id={`feature-${key}`}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor={`feature-${key}`} className="text-sm">
                    {t(`form.${key}`)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <IconLoader2 className="h-4 w-4 animate-spin" /> : t('form.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
