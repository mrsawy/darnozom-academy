'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import PillTab from '@/components/molecules/public-site/pill-tab';

interface CategoryFilterProps {
  categories: string[];
}

function CategoryFilter({ categories }: CategoryFilterProps) {
  const t = useTranslations('CoursesSection');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allText = t('all');
  const selectedCategory = searchParams.get('category') ?? allText;

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (category === allText) {
      params.delete('category');
    } else {
      params.set('category', category);
    }

    // Update the URL without a page reload so the grid filters in place.
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <PillTab
          key={category}
          isActive={selectedCategory === category}
          onClick={() => handleCategoryClick(category)}>
          {category}
        </PillTab>
      ))}
    </div>
  );
}

export default CategoryFilter;
