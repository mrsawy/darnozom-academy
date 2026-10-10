'use client';

import { useState } from 'react';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';
import { useInfiniteUsers } from '@/lib/hooks/user/use-user.hook';
import { useTranslations } from 'next-intl';

export interface OrgUserMultiSelectProps {
  value?: Option[];
  onChange?: (options: Option[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Filter by role name (e.g. "STUDENT"). Leave undefined for all roles. */
  roleFilter?: string;
  maxSelected?: number;
  className?: string;
}

export function OrgUserMultiSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  roleFilter,
  maxSelected,
  className,
}: OrgUserMultiSelectProps) {
  const t = useTranslations('OrgUserMultiSelect');
  const [search, setSearch] = useState('');
  const {
    data: options,
    hasMore,
    fetchNextPage,
    isLoading,
    isFetchingNextPage,
    pageSize,
  } = useInfiniteUsers({ search, roleFilter, pageSize: 10 });

  return (
    <MultipleSelector
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? t('selectUsers')}
      disabled={disabled}
      className={className}
      maxSelected={maxSelected}
      triggerSearchOnFocus
      onSearchChange={setSearch}
      onLoadMore={() => void fetchNextPage()}
      paginatedOptions={options}
      pageSize={pageSize}
      hasMore={hasMore}
      isLoadingMore={isFetchingNextPage}
      isSearchLoading={isLoading}
      emptyIndicator={
        <p className="text-muted-foreground py-4 text-center text-sm">{t('noUsersFound')}</p>
      }
      loadingIndicator={
        <p className="text-muted-foreground py-4 text-center text-sm">Loading users...</p>
      }
    />
  );
}
