'use client';

import { useState } from 'react';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';
import { useInfiniteCoursesByOrg } from '@/lib/hooks/course/useCourses';
import { useTranslations } from 'next-intl';

export interface CourseMultiSelectProps {
  value?: Option[];
  onChange?: (options: Option[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Limit selections (use `1` for single-select behavior). */
  maxSelected?: number;
  className?: string;
}

export function CourseMultiSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  maxSelected,
  className,
}: CourseMultiSelectProps) {
  const t = useTranslations('CourseMultiSelect');
  const [search, setSearch] = useState('');
  const { options, hasMore, fetchNextPage, isLoading, isFetchingNextPage, pageSize } =
    useInfiniteCoursesByOrg({ search, pageSize: 10 });

  return (
    <MultipleSelector
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? t('selectCourses')}
      disabled={disabled}
      maxSelected={maxSelected}
      className={className}
      triggerSearchOnFocus
      onSearchChange={setSearch}
      onLoadMore={() => void fetchNextPage()}
      paginatedOptions={options}
      pageSize={pageSize}
      hasMore={hasMore}
      isLoadingMore={isFetchingNextPage}
      isSearchLoading={isLoading}
      emptyIndicator={
        <p className="text-muted-foreground py-4 text-center text-sm">{t('noCoursesFound')}</p>
      }
      loadingIndicator={
        <p className="text-muted-foreground py-4 text-center text-sm">Loading courses...</p>
      }
    />
  );
}
