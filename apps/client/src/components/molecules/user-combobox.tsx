'use client';

import { Label } from '@/components/atoms/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/atoms/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { useInfiniteUsers, useUserByOrganization } from '@/lib/hooks/user/use-user.hook';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

const EMPTY_EXCLUDE: string[] = [];

export interface UserComboboxProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Pre-populate display label for edit mode before the user list loads. */
  initialLabel?: string;
  placeholder?: string;
  label?: string;
  roleFilter?: string;
  excludeUserIds?: string[];
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

function formatUserLabel(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
}): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  if (fullName) return fullName;
  return user.email ?? user.username ?? '';
}

export default function UserCombobox({
  value,
  onValueChange,
  initialLabel,
  placeholder,
  label,
  roleFilter,
  excludeUserIds = EMPTY_EXCLUDE,
  disabled = false,
  className,
  error = false,
}: UserComboboxProps) {
  const t = useTranslations('UserCombobox');
  const comboboxId = useId();
  const listboxId = `${comboboxId}-listbox`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(initialLabel);
  const fetchingRef = useRef(false);

  const {
    data: options,
    hasMore,
    fetchNextPage,
    isLoading,
    isFetchingNextPage,
  } = useInfiniteUsers({
    search,
    roleFilter,
    excludeUserIds,
    pageSize: 10,
  });

  fetchingRef.current = isFetchingNextPage;

  const labelFromOptions = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value]
  );

  const needsFetch = !!value && !labelFromOptions && !selectedLabel && !initialLabel;
  const { data: preSelectedUser } = useUserByOrganization(needsFetch ? value : '');

  const displayLabel = value
    ? (labelFromOptions ??
      selectedLabel ??
      initialLabel ??
      (preSelectedUser ? formatUserLabel(preSelectedUser) : undefined))
    : undefined;

  useEffect(() => {
    if (initialLabel && value) {
      setSelectedLabel((prev) => prev ?? initialLabel);
    }
  }, [initialLabel, value]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel(undefined);
      return;
    }
    if (labelFromOptions) {
      setSelectedLabel(labelFromOptions);
    } else if (preSelectedUser) {
      setSelectedLabel(formatUserLabel(preSelectedUser));
    }
  }, [value, labelFromOptions, preSelectedUser]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      if (nearBottom && hasMore && !fetchingRef.current) {
        void fetchNextPage();
      }
    },
    [hasMore, fetchNextPage]
  );

  const handleSelect = useCallback(
    (option: { value: string; label: string }) => {
      if (option.value === value) {
        onValueChange?.(null);
        setSelectedLabel(undefined);
        setOpen(false);
        return;
      }
      setSelectedLabel(option.label);
      onValueChange?.(option.value);
      setOpen(false);
      setSearch('');
    },
    [value, onValueChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onValueChange?.(null);
      setSelectedLabel(undefined);
    },
    [onValueChange]
  );

  return (
    <div className={className}>
      {label ? (
        <Label className="text-foreground mb-2 block text-sm font-medium">{label}</Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-disabled={disabled}
            onClick={() => {
              if (!disabled) setOpen((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen((prev) => !prev);
              }
            }}
            className={cn(
              'border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 inline-flex h-10 w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]',
              error && 'border-destructive',
              disabled && 'pointer-events-none opacity-50'
            )}>
            {displayLabel ? (
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="truncate font-medium">{displayLabel}</span>
                {disabled ? null : (
                  <button
                    type="button"
                    aria-label={t('clear')}
                    className="inline-flex shrink-0"
                    onClick={handleClear}
                    onPointerDown={(e) => e.stopPropagation()}>
                    <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                  </button>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground font-normal">
                {placeholder ?? t('selectUser')}
              </span>
            )}
            <ChevronsUpDown className="ms-auto size-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command id={listboxId} shouldFilter={false}>
            <CommandInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
            <CommandList onScroll={handleListScroll}>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : options.length === 0 ? (
                <CommandEmpty>{search ? t('noUsersFound') : t('typeToSearch')}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleSelect(option)}>
                        <span className="truncate">{option.label}</span>
                        <Check
                          className={cn(
                            'ms-auto h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : null}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
