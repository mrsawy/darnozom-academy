'use client';

import CategoryCombobox from '@/components/molecules/category-combobox';
import { useTranslations } from 'next-intl';
import { Tags } from 'lucide-react';
import { CourseFormSection } from './course-form-section';

interface CourseCategoriesSectionProps {
  selectedCategoryIds: string[];
  initialLabels?: Record<string, string>;
  onCategoriesChange: (ids: string[]) => void;
}

export function CourseCategoriesSection({
  selectedCategoryIds,
  initialLabels,
  onCategoriesChange,
}: CourseCategoriesSectionProps) {
  const t = useTranslations('CourseForm');

  return (
    <CourseFormSection title={t('categories')} description={t('categoriesHelp')} icon={Tags}>
      <CategoryCombobox
        multiple
        value={selectedCategoryIds}
        onValueChange={onCategoriesChange}
        initialLabels={initialLabels}
        label={t('selectCourseCategories')}
      />
    </CourseFormSection>
  );
}
