'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Combobox } from '@/components/molecules/combobox';
import type { ILocalizedLookup } from '@/lib/types/course/course.interface';

const ALL_VALUE = '__all__';

interface GradeSchoolTypeFilterProps {
  grades: ILocalizedLookup[];
  schoolTypes: ILocalizedLookup[];
}

function GradeSchoolTypeFilter({ grades, schoolTypes }: GradeSchoolTypeFilterProps) {
  const t = useTranslations('CoursesSection');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedGrade = searchParams.get('grade') ?? ALL_VALUE;
  const selectedSchoolType = searchParams.get('schoolType') ?? ALL_VALUE;

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  const gradeData = [
    { value: ALL_VALUE, label: t('allGrades') },
    ...grades.map((grade) => ({
      value: grade._id,
      label: isArabic ? grade.nameAr : grade.nameEn,
    })),
  ];

  const schoolTypeData = [
    { value: ALL_VALUE, label: t('allSchoolTypes') },
    ...schoolTypes.map((schoolType) => ({
      value: schoolType._id,
      label: isArabic ? schoolType.nameAr : schoolType.nameEn,
    })),
  ];

  if (grades.length === 0 && schoolTypes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {grades.length > 0 && (
        <Combobox
          data={gradeData}
          value={selectedGrade}
          title={t('allGrades')}
          placeholder={t('grade')}
          onValueChange={(value) => updateParam('grade', value)}
          buttonClassName="w-48"
        />
      )}
      {schoolTypes.length > 0 && (
        <Combobox
          data={schoolTypeData}
          value={selectedSchoolType}
          title={t('allSchoolTypes')}
          placeholder={t('schoolType')}
          onValueChange={(value) => updateParam('schoolType', value)}
          buttonClassName="w-48"
        />
      )}
    </div>
  );
}

export default GradeSchoolTypeFilter;
