'use client';

import { Input } from '@/components/atoms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { CreateCourseSchema, PricingDetails } from '@/lib/schema/course.schema';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { FieldErrors, PathValue, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Currency, CURRENCIES } from '@lms-organization/shared-types';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  getActiveSubscription,
  type ActiveSubscriptionResponse,
} from '@/lib/actions/subscription/subscription.action';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';
import { DollarSign, Info } from 'lucide-react';
import { getDiscountedPrice, isDiscountActive } from '@/lib/utils/discount.utils';
import { Switch } from '@/components/atoms/switch';
import { Label } from '@/components/atoms/label';
import { CourseFormSection } from './course-form-section';

interface CoursePricingSectionProps {
  isPaid: boolean;
  watch: UseFormWatch<CreateCourseSchema>;
  setValue: UseFormSetValue<CreateCourseSchema>;
  onPaidChange: (checked: boolean) => void;
  errors: FieldErrors<CreateCourseSchema>;
}

interface TaxInfoBannerProps {
  price: number | undefined | null;
  taxPercentage: number;
  currency: string;
  pricingDetails?: Partial<PricingDetails>;
}

function TaxInfoBanner({ price, taxPercentage, currency, pricingDetails }: TaxInfoBannerProps) {
  const t = useTranslations('CourseForm');

  if (!price || price <= 0 || taxPercentage <= 0) return null;

  const effectivePrice =
    pricingDetails && isDiscountActive(pricingDetails)
      ? getDiscountedPrice(price, pricingDetails)
      : price;
  const taxAmount = +(effectivePrice * (taxPercentage / 100)).toFixed(2);
  const netAmount = +(effectivePrice - taxAmount).toFixed(2);

  return (
    <div className="bg-muted/50 border-muted-foreground/20 rounded-lg border p-3 text-sm">
      <div className="flex items-start gap-2">
        <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="text-muted-foreground">{t('platformTaxInfo', { rate: taxPercentage })}</p>
          <div className="mt-2 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('enrollmentPrice')}</span>
              <span className="font-medium">
                {effectivePrice} {currency}
              </span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>{t('platformTaxRate', { rate: taxPercentage })}</span>
              <span>
                - {taxAmount} {currency}
              </span>
            </div>
            <div className="border-muted-foreground/20 flex justify-between border-t pt-0.5 font-semibold text-green-600">
              <span>{t('youWillReceive')}</span>
              <span>
                {netAmount} {currency}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PricingCycleFieldsProps {
  cycle: BillingCycle;
  label: string;
  watch: UseFormWatch<CreateCourseSchema>;
  setValue: UseFormSetValue<CreateCourseSchema>;
  taxPercentage: number;
}

function PricingCycleFields({
  cycle,
  label,
  watch,
  setValue,
  taxPercentage,
}: PricingCycleFieldsProps) {
  const t = useTranslations('CourseForm');
  const currentPricing = (watch('pricing')?.[cycle] ?? {}) as Partial<PricingDetails>;

  const setField = (field: keyof PricingDetails, value: unknown) => {
    setValue('pricing', {
      ...watch('pricing'),
      [cycle]: { ...currentPricing, [field]: value },
    } as PathValue<CreateCourseSchema, 'pricing'>);
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h5 className="text-sm font-semibold">{label}</h5>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm">{t('price')}</span>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            onChange={(e) =>
              setField('originalPrice', e.target.value ? Number(e.target.value) : undefined)
            }
            value={(currentPricing.originalPrice ?? '') as string | number}
            className="border-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm">{t('currency')}</span>
          <Select
            value={currentPricing.originalCurrency ?? undefined}
            onValueChange={(value) => setField('originalCurrency', value as Currency)}>
            <SelectTrigger className="border-3">
              <SelectValue placeholder={t('selectCurrency')} />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Discount fields */}
      <div className="space-y-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t('discountSection')}
        </span>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">{t('discountPercentage')}</span>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              onChange={(e) =>
                setField('discountPercentage', e.target.value ? Number(e.target.value) : undefined)
              }
              value={(currentPricing.discountPercentage ?? '') as string | number}
              className="border-3"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">{t('discountStartDate')}</span>
            <Input
              type="datetime-local"
              onChange={(e) =>
                setField('discountStartDate', e.target.value ? new Date(e.target.value) : undefined)
              }
              value={
                currentPricing.discountStartDate
                  ? new Date(currentPricing.discountStartDate).toISOString().slice(0, 16)
                  : ''
              }
              className="border-3"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">{t('discountEndDate')}</span>
            <Input
              type="datetime-local"
              onChange={(e) =>
                setField('discountEndDate', e.target.value ? new Date(e.target.value) : undefined)
              }
              value={
                currentPricing.discountEndDate
                  ? new Date(currentPricing.discountEndDate).toISOString().slice(0, 16)
                  : ''
              }
              className="border-3"
            />
          </div>
        </div>
        {currentPricing.discountPercentage ? (
          <p className="text-muted-foreground text-xs">{t('discountHelp')}</p>
        ) : null}
      </div>

      {/* Tax info — uses effective (post-discount) price */}
      <TaxInfoBanner
        price={currentPricing.originalPrice}
        taxPercentage={taxPercentage}
        currency={currentPricing.originalCurrency ?? ''}
        pricingDetails={currentPricing}
      />
    </div>
  );
}

export function CoursePricingSection({
  isPaid,
  watch,
  setValue,
  onPaidChange,
  errors: fieldErrors,
}: CoursePricingSectionProps) {
  const t = useTranslations('CourseForm');

  const { data: activeSubscription } = useQuery<ActiveSubscriptionResponse | null>({
    queryKey: ['activeSubscription'],
    queryFn: async (): Promise<ActiveSubscriptionResponse | null> =>
      throwIfNatsError(await getActiveSubscription()),
  });

  const taxPercentage = activeSubscription?.plan?.taxPercentage ?? 0;

  return (
    <CourseFormSection title={t('pricing')} description={t('pricingHelp')} icon={DollarSign}>
      <div className="bg-muted/20 hover:bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors">
        <div>
          <Label htmlFor="isPaid" className="cursor-pointer text-sm font-medium">
            {t('paidCourse')}
          </Label>
          <p className="text-muted-foreground text-xs">{t('paidCourseHelp')}</p>
        </div>
        <Switch id="isPaid" checked={isPaid} onCheckedChange={onPaidChange} />
      </div>

      {isPaid ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h4 className="font-medium">{t('pricingOptions')}</h4>
            <p className="text-muted-foreground text-sm">{t('pricingOptionsHelp')}</p>
          </div>

          {taxPercentage > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700 dark:border-orange-800/30 dark:bg-orange-950/20 dark:text-orange-400">
              <Info className="h-4 w-4 shrink-0" />
              <span>{t('platformTaxBanner', { rate: taxPercentage })}</span>
            </div>
          )}

          <PricingCycleFields
            cycle={BillingCycle.MONTHLY}
            label={t('monthlyPrice')}
            watch={watch}
            setValue={setValue}
            taxPercentage={taxPercentage}
          />

          <PricingCycleFields
            cycle={BillingCycle.YEARLY}
            label={t('yearlyPrice')}
            watch={watch}
            setValue={setValue}
            taxPercentage={taxPercentage}
          />

          <PricingCycleFields
            cycle={BillingCycle.ONE_TIME}
            label={t('oneTimePrice')}
            watch={watch}
            setValue={setValue}
            taxPercentage={taxPercentage}
          />
        </div>
      ) : null}

      {fieldErrors.pricing ? (
        <p className="text-destructive text-sm">{fieldErrors.pricing.message}</p>
      ) : null}
    </CourseFormSection>
  );
}
