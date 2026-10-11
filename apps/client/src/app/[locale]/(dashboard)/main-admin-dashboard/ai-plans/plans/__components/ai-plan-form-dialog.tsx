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
import { BillingCycle, CURRENCIES } from '@darnozom/shared-types';
import {
  aiPlanFormSchema,
  defaultAiPlanFormValues,
  type AiPlanFormValues,
} from './ai-plan-form.schema';
import type { AiPlanResponse } from '@/lib/actions/ai-plan/ai-plan.action';

const AI_PLAN_TIERS = ['FREE', 'PRO'] as const;
const BILLING_CYCLES = Object.values(BillingCycle);

interface AiPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: AiPlanResponse | null;
  onSubmit: (values: AiPlanFormValues) => void;
  isSubmitting: boolean;
}

export function AiPlanFormDialog({
  open,
  onOpenChange,
  plan,
  onSubmit,
  isSubmitting,
}: AiPlanFormDialogProps) {
  const t = useTranslations('AdminAiPlans');
  const isEdit = !!plan;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AiPlanFormValues>({
    resolver: yupResolver(aiPlanFormSchema),
    defaultValues: defaultAiPlanFormValues,
  });

  useEffect(() => {
    if (open) {
      if (plan) {
        reset({
          name: plan.name,
          description: plan.description,
          tier: plan.tier as 'FREE' | 'PRO',
          isActive: plan.isActive,
          features: {
            messagesPerDay: plan.features.messagesPerDay,
            aiAssistant: plan.features.aiAssistant,
          },
          price: {
            MONTHLY: plan.price.MONTHLY,
            YEARLY: plan.price.YEARLY,
            ONE_TIME: plan.price.ONE_TIME,
          },
        });
      } else {
        reset(defaultAiPlanFormValues);
      }
    }
  }, [open, plan, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editPlan') : t('createPlan')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ai-plan-name">{t('form.name')}</Label>
              <Input id="ai-plan-name" {...register('name')} />
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
                      {AI_PLAN_TIERS.map((tier) => (
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
            <Label htmlFor="ai-plan-description">{t('form.description')}</Label>
            <Input id="ai-plan-description" {...register('description')} />
            {errors.description ? (
              <p className="text-destructive text-xs">{errors.description.message}</p>
            ) : null}
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('form.features')}</h3>
            <div className="space-y-1">
              <Label htmlFor="messagesPerDay">{t('form.messagesPerDay')}</Label>
              <Input
                id="messagesPerDay"
                type="number"
                min="-1"
                {...register('features.messagesPerDay', { valueAsNumber: true })}
              />
              <p className="text-muted-foreground text-xs">{t('form.unlimitedHint')}</p>
              {errors.features?.messagesPerDay ? (
                <p className="text-destructive text-xs">{errors.features.messagesPerDay.message}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name="features.aiAssistant"
                control={control}
                render={({ field }) => (
                  <Switch id="aiAssistant" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="aiAssistant">{t('form.aiAssistant')}</Label>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('form.pricing')}</h3>
            {BILLING_CYCLES.map((cycle) => (
              <div key={cycle} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">
                  {cycle === BillingCycle.MONTHLY
                    ? t('form.monthlySection')
                    : cycle === BillingCycle.YEARLY
                      ? t('form.yearlySection')
                      : t('form.oneTimeSection')}
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

          <div className="flex items-center gap-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="ai-plan-isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="ai-plan-isActive">{t('form.isActive')}</Label>
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
