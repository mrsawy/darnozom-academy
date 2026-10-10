'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Slider } from '@/components/atoms/slider';
import { Label } from '@/components/atoms/label';
import { Combobox } from '@/components/molecules/combobox';
import CategoryCombobox from '@/components/molecules/category-combobox';
import { DualRangeSlider } from '@/components/molecules/dual-range-slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { Currency, CURRENCIES } from '@lms-organization/shared-types';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { usePublicGrades } from '@/lib/hooks/grade/use-grades.hook';
import { usePublicSchoolTypes } from '@/lib/hooks/school-type/use-school-types.hook';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';

const ALL_VALUE = '__all__';

interface CategoryFilterFieldProps {
  value?: string;
  onChange: (value?: string) => void;
  label?: string;
}

function CategoryFilterField({ value, onChange, label }: CategoryFilterFieldProps) {
  return (
    <CategoryCombobox
      value={value}
      onValueChange={(categoryId) => onChange(categoryId || undefined)}
      label={label}
    />
  );
}

interface RatingFilterFieldProps {
  value?: number;
  onChange: (value?: number) => void;
  label: string;
  max?: number;
  step?: number;
}

function RatingFilterField({
  value,
  onChange,
  label,
  max = 5,
  step = 0.5,
}: RatingFilterFieldProps) {
  const t = useTranslations('FiltersDrawer');

  return (
    <div>
      <Label className="text-lms-text-primary mb-3 block font-medium">
        {label}: {value ?? 0}+
      </Label>
      <div className="flex flex-row items-center gap-4">
        <Slider
          value={[value ?? 0]}
          onValueChange={(sliderValue) => onChange(sliderValue[0] || undefined)}
          max={max}
          step={step}
          className="w-56 lg:w-80"
        />
        <span className="min-w-[3rem] text-sm whitespace-nowrap text-gray-600">
          {t('minRatingValue', { value: value ?? 0 })}
        </span>
      </div>
    </div>
  );
}

interface ModulesFilterFieldProps {
  value?: number;
  onChange: (value?: number) => void;
  label: string;
  max?: number;
}

function ModulesFilterField({ value, onChange, label, max = 100 }: ModulesFilterFieldProps) {
  return (
    <div>
      <Label className="text-lms-text-primary mb-3 block font-medium">
        {label}: {value ?? 0}+
      </Label>
      <div className="flex flex-row items-center gap-4">
        <Slider
          value={[value ?? 0]}
          onValueChange={(sliderValue) => onChange(sliderValue[0] || undefined)}
          max={max}
          step={1}
          className="w-56 lg:w-80"
        />
        <span className="min-w-[3rem] text-sm text-gray-600">{value ?? 0}+</span>
      </div>
    </div>
  );
}

interface PriceRangeFilterFieldProps {
  minPrice?: number;
  maxPrice?: number;
  priceCurrency?: string;
  billingCycle?: BillingCycle;
  onPriceChange: (value: { minPrice?: number; maxPrice?: number }) => void;
  onCurrencyChange: (value?: string) => void;
  onBillingCycleChange: (value: BillingCycle) => void;
  labels: {
    priceRange: string;
    billingCycle: string;
    currency: string;
    oneTime: string;
  };
}

function PriceRangeFilterField({
  minPrice,
  maxPrice,
  priceCurrency,
  billingCycle,
  onPriceChange,
  onCurrencyChange,
  onBillingCycleChange,
  labels,
}: PriceRangeFilterFieldProps) {
  const selectedBillingCycle = billingCycle ?? BillingCycle.MONTHLY;
  const selectedCurrency = priceCurrency ?? Currency.EGP;

  return (
    <div>
      <div className="mb-4 flex flex-row flex-wrap items-start gap-6">
        <div>
          <Label className="text-lms-text-primary mb-3 block font-medium">
            {labels.priceRange} (
            {selectedBillingCycle === BillingCycle.ONE_TIME
              ? labels.oneTime
              : selectedBillingCycle.charAt(0).toUpperCase() + selectedBillingCycle.slice(1)}
            ):
          </Label>
          <div className="flex flex-row items-center gap-5">
            <DualRangeSlider
              label={(value) => value}
              value={[minPrice ?? 0, maxPrice ?? 5000]}
              onValueChange={(sliderValue) => {
                onPriceChange({ minPrice: sliderValue[0], maxPrice: sliderValue[1] });
              }}
              min={0}
              max={5000}
              step={1}
              className="w-56 lg:w-80"
            />
            <Combobox
              defaultValue={{ value: selectedCurrency, label: selectedCurrency }}
              data={CURRENCIES.map((currency) => ({
                value: currency,
                label: currency,
              }))}
              title={labels.currency}
              placeholder={`${labels.currency}...`}
              onValueChange={(value) => onCurrencyChange(value || undefined)}
              buttonClassName="w-24 text-xs lg:w-32"
            />
          </div>
        </div>

        <div>
          <Label className="text-lms-text-primary mb-3 block font-medium">
            {labels.billingCycle}
          </Label>
          <Tabs
            defaultValue={selectedBillingCycle}
            onValueChange={(value) => onBillingCycleChange(value as BillingCycle)}>
            <TabsList>
              {Object.values(BillingCycle).map((cycle) => (
                <TabsTrigger value={cycle} key={cycle}>
                  {cycle === BillingCycle.ONE_TIME
                    ? labels.oneTime
                    : cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface LookupFilterFieldProps {
  value?: string;
  onChange: (value?: string) => void;
  label: string;
  allLabel: string;
  placeholder: string;
}

function GradeFilterField({
  value,
  onChange,
  label,
  allLabel,
  placeholder,
}: LookupFilterFieldProps) {
  const locale = useLocale();
  const { data: grades, isLoading } = usePublicGrades();

  const data = [
    { value: ALL_VALUE, label: allLabel },
    ...(grades ?? []).map((grade) => ({
      value: grade._id,
      label: locale === 'ar' ? grade.nameAr : grade.nameEn,
    })),
  ];

  return (
    <div>
      <Label className="text-lms-text-primary mb-3 block font-medium">{label}</Label>
      <Combobox
        data={data}
        value={value ?? ALL_VALUE}
        title={allLabel}
        placeholder={placeholder}
        isLoading={isLoading}
        onValueChange={(selected) => onChange(selected === ALL_VALUE ? undefined : selected)}
        buttonClassName="w-full"
      />
    </div>
  );
}

function SchoolTypeFilterField({
  value,
  onChange,
  label,
  allLabel,
  placeholder,
}: LookupFilterFieldProps) {
  const locale = useLocale();
  const { data: schoolTypes, isLoading } = usePublicSchoolTypes();

  const data = [
    { value: ALL_VALUE, label: allLabel },
    ...(schoolTypes ?? []).map((schoolType) => ({
      value: schoolType._id,
      label: locale === 'ar' ? schoolType.nameAr : schoolType.nameEn,
    })),
  ];

  return (
    <div>
      <Label className="text-lms-text-primary mb-3 block font-medium">{label}</Label>
      <Combobox
        data={data}
        value={value ?? ALL_VALUE}
        title={allLabel}
        placeholder={placeholder}
        isLoading={isLoading}
        onValueChange={(selected) => onChange(selected === ALL_VALUE ? undefined : selected)}
        buttonClassName="w-full"
      />
    </div>
  );
}

interface LookupMultiFilterFieldProps {
  value?: string[];
  onChange: (value: string[]) => void;
  label: string;
  placeholder: string;
}

function GradeMultiFilterField({
  value,
  onChange,
  label,
  placeholder,
}: LookupMultiFilterFieldProps) {
  const locale = useLocale();
  const { data: grades, isLoading } = usePublicGrades();

  const options: Option[] = (grades ?? []).map((grade) => ({
    value: grade._id,
    label: locale === 'ar' ? grade.nameAr : grade.nameEn,
  }));

  const selected = options.filter((option) => (value ?? []).includes(option.value));

  return (
    <div>
      <Label className="text-lms-text-primary mb-3 block font-medium">{label}</Label>
      <MultipleSelector
        options={options}
        value={selected}
        placeholder={placeholder}
        loadingIndicator={isLoading ? <span className="text-sm text-gray-500">…</span> : undefined}
        onChange={(opts) => onChange(opts.map((o) => o.value))}
      />
    </div>
  );
}

function SchoolTypeMultiFilterField({
  value,
  onChange,
  label,
  placeholder,
}: LookupMultiFilterFieldProps) {
  const locale = useLocale();
  const { data: schoolTypes, isLoading } = usePublicSchoolTypes();

  const options: Option[] = (schoolTypes ?? []).map((schoolType) => ({
    value: schoolType._id,
    label: locale === 'ar' ? schoolType.nameAr : schoolType.nameEn,
  }));

  const selected = options.filter((option) => (value ?? []).includes(option.value));

  return (
    <div>
      <Label className="text-lms-text-primary mb-3 block font-medium">{label}</Label>
      <MultipleSelector
        options={options}
        value={selected}
        placeholder={placeholder}
        loadingIndicator={isLoading ? <span className="text-sm text-gray-500">…</span> : undefined}
        onChange={(opts) => onChange(opts.map((o) => o.value))}
      />
    </div>
  );
}

export {
  CategoryFilterField,
  RatingFilterField,
  ModulesFilterField,
  PriceRangeFilterField,
  GradeFilterField,
  SchoolTypeFilterField,
  GradeMultiFilterField,
  SchoolTypeMultiFilterField,
};
