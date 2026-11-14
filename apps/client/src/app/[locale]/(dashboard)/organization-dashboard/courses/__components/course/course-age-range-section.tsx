'use client';

import { useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Label } from '@/components/atoms/label';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';
import { useAgeRanges } from '@/lib/hooks/age-range/use-age-ranges.hook';
import { Users } from 'lucide-react';
import { CourseFormSection } from './course-form-section';

const EMPTY_AGE_RANGE_IDS: string[] = [];

interface CourseAgeRangeSectionProps {
  ageRangeIds?: string[];
  onAgeRangeIdsChange: (ids: string[]) => void;
}

/** Optional multi-select of the age ranges a course is intended for. */
export function CourseAgeRangeSection({ ageRangeIds = EMPTY_AGE_RANGE_IDS, onAgeRangeIdsChange }: CourseAgeRangeSectionProps) {
  const t = useTranslations('CourseForm');
  const locale = useLocale();
  const localizedName = useCallback(
    (item: { nameEn: string; nameAr: string }) => (locale === 'ar' ? item.nameAr : item.nameEn),
    [locale]
  );

  const { data: ageRanges, isLoading } = useAgeRanges();

  const options: Option[] = useMemo(
    () => (ageRanges ?? []).map((a) => ({ value: a._id, label: localizedName(a) })),
    [ageRanges, localizedName]
  );

  const selected = useMemo(() => options.filter((option) => ageRangeIds.includes(option.value)), [options, ageRangeIds]);

  return (
    <CourseFormSection title={t('ageRangeSection')} description={t('ageRangeSectionHelp')} icon={Users}>
      <div className="space-y-1.5">
        <Label>{t('ageRange')}</Label>
        <MultipleSelector
          options={options}
          value={selected}
          placeholder={t('searchPlaceholder')}
          loadingIndicator={isLoading ? <span className="text-muted-foreground text-sm">…</span> : undefined}
          onChange={(opts) => onAgeRangeIdsChange(opts.map((o) => o.value))}
        />
      </div>
    </CourseFormSection>
  );
}
