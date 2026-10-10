'use client';

import { useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Label } from '@/components/atoms/label';
import { Combobox } from '@/components/molecules/combobox';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';
import { useGrades } from '@/lib/hooks/grade/use-grades.hook';
import { useSchoolTypes } from '@/lib/hooks/school-type/use-school-types.hook';
import { GraduationCap } from 'lucide-react';
import { CourseFormSection } from './course-form-section';

const NONE_VALUE = '__none__';
const EMPTY_SCHOOL_TYPE_IDS: string[] = [];

interface CourseGradeSchoolTypeSectionProps {
  gradeId?: string | null;
  schoolTypeIds?: string[];
  onGradeChange: (id: string | null) => void;
  onSchoolTypeIdsChange: (ids: string[]) => void;
}

/**
 * Two fully independent optional selectors. Grade and School Type never filter or
 * require each other; either can be empty while the other has a value.
 */
export function CourseGradeSchoolTypeSection({
  gradeId,
  schoolTypeIds = EMPTY_SCHOOL_TYPE_IDS,
  onGradeChange,
  onSchoolTypeIdsChange,
}: CourseGradeSchoolTypeSectionProps) {
  const t = useTranslations('CourseForm');
  const locale = useLocale();
  const localizedName = useCallback(
    (item: { nameEn: string; nameAr: string }) => (locale === 'ar' ? item.nameAr : item.nameEn),
    [locale]
  );

  const { data: grades, isLoading: isLoadingGrades } = useGrades();
  const { data: schoolTypes, isLoading: isLoadingSchoolTypes } = useSchoolTypes();

  const gradeItems = useMemo(
    () => [
      { value: NONE_VALUE, label: t('gradeNone') },
      ...(grades ?? []).map((g) => ({ value: g._id, label: localizedName(g) })),
    ],
    [grades, t, localizedName]
  );

  const schoolTypeOptions: Option[] = useMemo(
    () =>
      (schoolTypes ?? []).map((s) => ({
        value: s._id,
        label: localizedName(s),
      })),
    [schoolTypes, localizedName]
  );

  const selectedSchoolTypeOptions = useMemo(
    () => schoolTypeOptions.filter((option) => schoolTypeIds.includes(option.value)),
    [schoolTypeOptions, schoolTypeIds]
  );

  return (
    <CourseFormSection
      title={t('gradeAndSchoolType')}
      description={t('gradeAndSchoolTypeHelp')}
      icon={GraduationCap}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('grade')}</Label>
          <Combobox
            data={gradeItems}
            value={gradeId ?? NONE_VALUE}
            placeholder={t('searchPlaceholder')}
            title={t('gradeNone')}
            isLoading={isLoadingGrades}
            onValueChange={(value) => onGradeChange(value === NONE_VALUE ? null : value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t('schoolType')}</Label>
          <MultipleSelector
            options={schoolTypeOptions}
            value={selectedSchoolTypeOptions}
            placeholder={t('searchPlaceholder')}
            loadingIndicator={
              isLoadingSchoolTypes ? (
                <span className="text-muted-foreground text-sm">…</span>
              ) : undefined
            }
            onChange={(opts) => onSchoolTypeIdsChange(opts.map((o) => o.value))}
          />
        </div>
      </div>
    </CourseFormSection>
  );
}
