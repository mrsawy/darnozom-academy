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
import { Badge } from '@/components/atoms/badge';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import {
  useApprovedCategoryById,
  useInfiniteFilteredCategories,
} from '@/lib/hooks/category/use-category.hook';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

interface SingleProps {
  multiple?: false;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface MultipleProps {
  multiple: true;
  value?: string[];
  onValueChange?: (value: string[]) => void;
  /** Pre-populate display labels for already-selected IDs (e.g. from edit mode). */
  initialLabels?: Record<string, string>;
}

type CategoryComboboxProps = (SingleProps | MultipleProps) & {
  label?: string;
  className?: string;
};

const EMPTY_ARRAY: string[] = [];

export default function CategoryCombobox(props: CategoryComboboxProps) {
  const { label, className } = props;
  const t = useTranslations('Instructors');
  const tCombobox = useTranslations('CategoryCombobox');
  const comboboxId = useId();
  const listboxId = `${comboboxId}-listbox`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const fetchingRef = useRef(false);

  const isMultiple = props.multiple === true;
  const multiValue: string[] = isMultiple
    ? ((props as MultipleProps).value ?? EMPTY_ARRAY)
    : EMPTY_ARRAY;
  const singleValue: string | undefined = isMultiple ? undefined : (props as SingleProps).value;
  const initialLabels: Record<string, string> | undefined = isMultiple
    ? (props as MultipleProps).initialLabels
    : undefined;

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage, isLoading } =
    useInfiniteFilteredCategories(search);

  fetchingRef.current = isFetchingNextPage;

  const options = useMemo(() => data?.pages.flatMap((page) => page.docs) ?? [], [data]);

  // Single-select: resolve display label for pre-selected value not yet in loaded options
  const labelFromOptions = options.find((c) => c._id === singleValue)?.name;
  const { data: preSelectedCategory } = useApprovedCategoryById(
    singleValue ?? '',
    !isMultiple && !!singleValue && !labelFromOptions
  );
  const selectedSingleLabel = labelFromOptions ?? preSelectedCategory?.name;

  // Multi-select: maintain id → name map so we can display badges
  const [selectedLabels, setSelectedLabels] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    if (initialLabels) {
      for (const [id, name] of Object.entries(initialLabels)) {
        map.set(id, name);
      }
    }
    return map;
  });

  const onSingleChange = isMultiple ? undefined : (props as SingleProps).onValueChange;
  const onMultiChange = isMultiple ? (props as MultipleProps).onValueChange : undefined;

  // Seed labels from initialLabels when they arrive (edit-mode hydration)
  useEffect(() => {
    if (!initialLabels) return;
    setSelectedLabels((prev) => {
      const next = new Map(prev);
      for (const [id, name] of Object.entries(initialLabels)) {
        if (!next.has(id)) next.set(id, name);
      }
      return next;
    });
  }, [initialLabels]);

  // Resolve labels for pre-selected IDs as options load in
  useEffect(() => {
    if (!isMultiple || multiValue.length === 0) return;
    setSelectedLabels((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const opt of options) {
        if (multiValue.includes(opt._id) && !next.has(opt._id)) {
          next.set(opt._id, opt.name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [options, multiValue, isMultiple]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      if (nearBottom && hasNextPage && !fetchingRef.current) {
        void fetchNextPage();
      }
    },
    [hasNextPage, fetchNextPage]
  );

  const handleSelect = useCallback(
    (cat: { _id: string; name: string }) => {
      if (!isMultiple) {
        onSingleChange?.(cat._id === singleValue ? '' : cat._id);
        setOpen(false);
        return;
      }
      const isSelected = multiValue.includes(cat._id);
      const next = isSelected
        ? multiValue.filter((id) => id !== cat._id)
        : [...multiValue, cat._id];
      if (!isSelected) {
        setSelectedLabels((prev) => new Map(prev).set(cat._id, cat.name));
      }
      onMultiChange?.(next);
      // keep popover open for multi-select
    },
    [isMultiple, singleValue, multiValue, onSingleChange, onMultiChange]
  );

  const removeItem = useCallback(
    (id: string) => {
      if (!isMultiple) return;
      const next = multiValue.filter((v) => v !== id);
      onMultiChange?.(next);
    },
    [isMultiple, multiValue, onMultiChange]
  );

  const displayLabel = label ?? t('category');

  return (
    <div className={className}>
      <Label className="text-lms-text-primary mb-3 block font-medium">{displayLabel}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/*
            Use a div (not <button>) so multi-select remove controls can be real
            buttons without nesting interactive elements.
          */}
          <div
            role="combobox"
            tabIndex={0}
            aria-expanded={open}
            aria-controls={listboxId}
            className={cn(
              'border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 inline-flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]',
              isMultiple && multiValue.length > 0 ? 'h-auto min-h-10 flex-wrap gap-1 py-2' : 'h-9'
            )}>
            {isMultiple ? (
              multiValue.length > 0 ? (
                <>
                  {multiValue.map((id) => (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                      {selectedLabels.get(id) ?? id}
                      <button
                        type="button"
                        aria-label={tCombobox('remove')}
                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeItem(id);
                        }}
                        onPointerDown={(e) => {
                          // Prevent PopoverTrigger from toggling when removing a chip.
                          e.stopPropagation();
                        }}>
                        <X className="size-2.5" />
                      </button>
                    </Badge>
                  ))}
                </>
              ) : (
                <span className="text-muted-foreground font-normal">{t('filterByCategory')}</span>
              )
            ) : selectedSingleLabel ? (
              <span className="flex min-w-0 items-center gap-1">
                <span className="truncate">{selectedSingleLabel}</span>
                <button
                  type="button"
                  aria-label={tCombobox('clear')}
                  className="inline-flex shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    (props as SingleProps).onValueChange?.('');
                  }}
                  onPointerDown={(e) => e.stopPropagation()}>
                  <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                </button>
              </span>
            ) : (
              <span className="text-muted-foreground font-normal">{t('filterByCategory')}</span>
            )}
            <ChevronsUpDown className="ml-auto shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command id={listboxId} shouldFilter={false}>
            <CommandInput
              placeholder={t('searchCategoryPlaceholder')}
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
                <CommandEmpty>
                  {search ? t('noCategoriesFound') : t('typeToSearchCategories')}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {options.map((cat) => {
                    const isSelected = isMultiple
                      ? multiValue.includes(cat._id)
                      : singleValue === cat._id;
                    return (
                      <CommandItem key={cat._id} value={cat._id} onSelect={() => handleSelect(cat)}>
                        {cat.name}
                        <Check
                          className={cn(
                            'ml-auto h-4 w-4',
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
