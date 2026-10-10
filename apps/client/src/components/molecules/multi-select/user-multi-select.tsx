'use client';

import { useState } from 'react';
import MultipleSelector, { Option } from '@/components/molecules/multi-select/multi-select';
import { useInfiniteUsers } from '@/lib/hooks/user/use-user.hook';
import { useTranslations } from 'next-intl';

const DEFAULT_EXCLUDE_USER_IDS: string[] = [];

export interface UserMultiSelectProps {
  value?: Option[];
  onChange?: (options: Option[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Filter users by role (e.g. only students for parent's children) */
  roleFilter?: string;
  /** Exclude these user IDs from the list */
  excludeUserIds?: string[];
  /** Max number of selections (e.g. 1 for single parent) */
  maxSelected?: number;
  className?: string;
}

export function UserMultiSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  roleFilter,
  excludeUserIds = DEFAULT_EXCLUDE_USER_IDS,
  maxSelected,
  className,
}: UserMultiSelectProps) {
  const t = useTranslations('UserMultiSelect');
  const [search, setSearch] = useState('');
  const {
    data: options,
    hasMore,
    fetchNextPage,
    isLoading,
    isFetchingNextPage,
    pageSize,
  } = useInfiniteUsers({
    search,
    roleFilter,
    excludeUserIds,
    pageSize: 10,
  });

  return (
    <MultipleSelector
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? t('selectUsers')}
      disabled={disabled}
      className={className}
      triggerSearchOnFocus
      onSearchChange={setSearch}
      onLoadMore={() => void fetchNextPage()}
      paginatedOptions={options}
      pageSize={pageSize}
      hasMore={hasMore}
      isLoadingMore={isFetchingNextPage}
      isSearchLoading={isLoading}
      maxSelected={maxSelected}
      emptyIndicator={
        <p className="text-muted-foreground py-4 text-center text-sm">{t('noUsersFound')}</p>
      }
      loadingIndicator={
        <p className="text-muted-foreground py-4 text-center text-sm">{t('loadingUsers')}</p>
      }
    />
  );
}
