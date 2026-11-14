'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Combobox } from '@/components/molecules/combobox';
import type { ILocalizedLookup } from '@/lib/types/course/course.interface';

const ALL_VALUE = '__all__';

interface AgeRangeFilterProps {
  ageRanges: ILocalizedLookup[];
}

function AgeRangeFilter({ ageRanges }: AgeRangeFilterProps) {
  const t = useTranslations('CoursesSection');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedAgeRange = searchParams.get('ageRange') ?? ALL_VALUE;

  const updateParam = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete('ageRange');
    } else {
      params.set('ageRange', value);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  if (ageRanges.length === 0) return null;

  const data = [
    { value: ALL_VALUE, label: t('allAgeRanges') },
    ...ageRanges.map((ageRange) => ({
      value: ageRange._id,
      label: isArabic ? ageRange.nameAr : ageRange.nameEn,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-3">
      <Combobox
        data={data}
        value={selectedAgeRange}
        title={t('allAgeRanges')}
        placeholder={t('ageRange')}
        onValueChange={updateParam}
        buttonClassName="w-48"
      />
    </div>
  );
}

export default AgeRangeFilter;
