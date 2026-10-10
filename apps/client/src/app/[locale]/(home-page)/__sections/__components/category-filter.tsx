'use client';

import { Button } from '@/components/atoms/button';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

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

    // Update URL without page reload
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {categories.map((category) => {
        const isSelected = selectedCategory === category;
        return (
          <Button
            key={category}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryClick(category)}
            className="border-border hover:border-brand-purple/30">
            {category}
          </Button>
        );
      })}
    </div>
  );
}

export default CategoryFilter;
