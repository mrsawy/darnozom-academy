'use client';

import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { useTranslations } from 'next-intl';
import { ICategory } from '@/lib/types/category/ICategory';

interface CategoryHeaderProps {
  parentCategory?: ICategory | null;
  categoryName: string;
}

export function CategoryHeader({ parentCategory, categoryName }: CategoryHeaderProps) {
  const t = useTranslations('SingleCategoryView');

  return (
    <div className="mb-6">
      <Link
        className="mb-4 flex items-center transition-colors"
        href="/organization-dashboard/categories/">
        <ArrowLeft className="mr-2 h-5 w-5" />
        {t('backToCategories')}
      </Link>

      {/* Breadcrumb */}
      {parentCategory ? (
        <nav className="mb-4 flex items-center text-sm">
          <Button type="button" variant="ghost" className="h-auto p-0">
            {parentCategory.name}
          </Button>
          <ChevronRight className="mx-2 h-4 w-4" />
          <span className="font-medium">{categoryName}</span>
        </nav>
      ) : null}
    </div>
  );
}
