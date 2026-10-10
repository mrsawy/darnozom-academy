'use client';

import { ChevronRight, Folder } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { useTranslations } from 'next-intl';
import { ICategory } from '@/lib/types/category/ICategory';

interface ParentCategoryCardProps {
  parentCategory: ICategory;
}

export function ParentCategoryCard({ parentCategory }: ParentCategoryCardProps) {
  const t = useTranslations('SingleCategoryView');

  return (
    <div className="rounded-xl border p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{t('parentCategory')}</h3>
      <Button
        type="button"
        variant="outline"
        className="flex w-full items-center justify-start p-3 text-left">
        <Folder className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <div className="font-medium">{parentCategory.name}</div>
          <div className="text-sm">{parentCategory.description}</div>
        </div>
        <ChevronRight className="ml-auto h-4 w-4" />
      </Button>
    </div>
  );
}
