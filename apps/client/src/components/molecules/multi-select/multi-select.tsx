'use client';

import { Command as CommandPrimitive, useCommandState } from 'cmdk';
import { X, ChevronDownIcon } from 'lucide-react';
import * as React from 'react';
import { forwardRef, useEffect } from 'react';

import { Badge } from '@/components/atoms/badge';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/atoms/command';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/use-debounce';

export interface Option {
  value: string;
  label: string;
  disable?: boolean;
  /** fixed option that can't be removed. */
  fixed?: boolean;
  /** Group the options by providing key. */
  [key: string]: string | boolean | undefined;
}
type GroupOption = Record<string, Option[]>;

interface MultipleSelectorProps {
  value?: Option[];
  defaultOptions?: Option[];
  /** manually controlled options */
  options?: Option[];
  placeholder?: string;
  /** Loading component. */
  loadingIndicator?: React.ReactNode;
  /** Empty component. */
  emptyIndicator?: React.ReactNode;
  /** Debounce time for async search. Only work with `onSearch`. */
  delay?: number;
  /**
   * Only work with `onSearch` prop. Trigger search when `onFocus`.
   * For example, when user click on the input, it will trigger the search to get initial options.
   **/
  triggerSearchOnFocus?: boolean;
  /** async search */
  onSearch?: (value: string) => Promise<Option[]>;
  /**
   * Paginated async search for infinite scroll. When provided, loads initial page then more on scroll.
   * Use instead of onSearch when you need load-more behavior.
   */
  onSearchPaginated?: (
    value: string,
    page: number
  ) => Promise<{ options: Option[]; hasMore: boolean }>;
  /**
   * When using onSearchPaginated, pass options from the parent (e.g. from useInfiniteUsers).
   * Search/scroll will still call onSearchPaginated so the parent can update query params and options.
   */
  paginatedOptions?: Option[];
  /**
   * When using useInfiniteQuery: call this when search term changes so the parent can refetch with new params.
   */
  onSearchChange?: (search: string) => void;
  /**
   * When using useInfiniteQuery: call this when user scrolls near bottom to load the next page.
   */
  onLoadMore?: () => void;
  /** When using onLoadMore, pass true while the next page is loading (e.g. isFetchingNextPage). */
  isLoadingMore?: boolean;
  /** When using onLoadMore, pass false when there are no more pages (e.g. !hasNextPage). */
  hasMore?: boolean;
  /** When using onSearchChange/onLoadMore, pass true while the initial/current search is loading (e.g. isLoading). */
  isSearchLoading?: boolean;
  /** Page size for onSearchPaginated (default 10). */
  pageSize?: number;
  /**
   * sync search. This search will not showing loadingIndicator.
   * The rest props are the same as async search.
   * i.e.: creatable, groupBy, delay.
   **/
  onSearchSync?: (value: string) => Option[];
  onChange?: (options: Option[]) => void;
  /** Limit the maximum number of selected options. */
  maxSelected?: number;
  /** When the number of selected options exceeds the limit, the onMaxSelected will be called. */
  onMaxSelected?: (maxLimit: number) => void;
  /** Hide the placeholder when there are options selected. */
  hidePlaceholderWhenSelected?: boolean;
  disabled?: boolean;
  /** Group the options base on provided key. */
  groupBy?: string;
  className?: string;
  badgeClassName?: string;
  /**
   * First item selected is a default behavior by cmdk. That is why the default is true.
   * This is a workaround solution by add a dummy item.
   *
   * @reference: https://github.com/pacocoursey/cmdk/issues/171
   */
  selectFirstItem?: boolean;
  /** Allow user to create option when there is no option matched. */
  creatable?: boolean;
  /** Props of `Command` */
  commandProps?: React.ComponentPropsWithoutRef<typeof Command>;
  /** Props of `CommandInput` */
  inputProps?: Omit<
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>,
    'value' | 'placeholder' | 'disabled'
  >;
  /** hide the clear all button. */
  hideClearAllButton?: boolean;
}

export interface MultipleSelectorRef {
  selectedValue: Option[];
  input: HTMLInputElement;
  focus: () => void;
  reset: () => void;
}

// export function useDebounce<T>(value: T, delay?: number): T {
//     const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

//     useEffect(() => {
//         const timer = setTimeout(() => setDebouncedValue(value), delay ?? 500);

//         return () => {
//             clearTimeout(timer);
//         };
//     }, [value, delay]);

//     return debouncedValue;
// }

function transToGroupOption(options: Option[], groupBy?: string) {
  if (options.length === 0) {
    return {};
  }
  if (!groupBy) {
    return {
      '': options,
    };
  }

  const groupOption: GroupOption = {};
  for (const option of options) {
    const key = (option[groupBy] as string) ?? '';
    if (!groupOption[key]) {
      groupOption[key] = [];
    }
    groupOption[key].push(option);
  }
  return groupOption;
}

function removePickedOption(groupOption: GroupOption, picked: Option[]) {
  const cloneOption = structuredClone(groupOption);

  for (const [key, value] of Object.entries(cloneOption)) {
    cloneOption[key] = value.filter((val) => !picked.some((p) => p.value === val.value));
  }
  return cloneOption;
}

function isOptionsExist(groupOption: GroupOption, targetOption: Option[]) {
  for (const [, value] of Object.entries(groupOption)) {
    if (value.some((option) => targetOption.find((p) => p.value === option.value))) {
      return true;
    }
  }
  return false;
}

/**
 * The `CommandEmpty` of shadcn/ui will cause the cmdk empty not rendering correctly.
 * So we create one and copy the `Empty` implementation from `cmdk`.
 *
 * @reference: https://github.com/hsuanyi-chou/shadcn-ui-expansions/issues/34#issuecomment-1949561607
 **/
const CommandEmpty = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CommandPrimitive.Empty>
>(({ className, ...props }, forwardedRef) => {
  const render = useCommandState((state) => state.filtered.count === 0);

  if (!render) return null;

  return (
    <div
      ref={forwardedRef}
      className={cn('py-6 text-center text-sm', className)}
      role="presentation"
      {...props}
    />
  );
});

CommandEmpty.displayName = 'CommandEmpty';

const MultipleSelector = React.forwardRef<MultipleSelectorRef, MultipleSelectorProps>(
  (
    {
      value,
      onChange,
      placeholder,
      defaultOptions: arrayDefaultOptions = [],
      options: arrayOptions,
      delay,
      onSearch,
      onSearchPaginated,
      paginatedOptions,
      onSearchChange,
      onLoadMore,
      isLoadingMore: isLoadingMoreProp,
      hasMore: hasMoreProp,
      isSearchLoading: isSearchLoadingProp,
      pageSize: _pageSize = 10,
      onSearchSync,
      loadingIndicator,
      emptyIndicator,
      maxSelected = Number.MAX_SAFE_INTEGER,
      onMaxSelected,
      hidePlaceholderWhenSelected,
      disabled,
      groupBy,
      className,
      badgeClassName,
      selectFirstItem = true,
      creatable = false,
      triggerSearchOnFocus = false,
      commandProps,
      inputProps,
      hideClearAllButton = false,
    }: MultipleSelectorProps,
    ref: React.Ref<MultipleSelectorRef>
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [onScrollbar, setOnScrollbar] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null); // Added this

    const [selected, setSelected] = React.useState<Option[]>(value ?? []);
    const [options, setOptions] = React.useState<GroupOption>(
      transToGroupOption(arrayDefaultOptions, groupBy)
    );
    const [paginatedPage, setPaginatedPage] = React.useState(1);
    const [hasMorePaginated, setHasMorePaginated] = React.useState(false);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const debouncedSearchTerm = useDebounce(inputValue, delay ?? 500);

    React.useImperativeHandle(
      ref,
      () => ({
        selectedValue: [...selected],
        input: inputRef.current ?? new HTMLInputElement(),
        focus: () => inputRef?.current?.focus(),
        reset: () => setSelected([]),
      }),
      [selected]
    );

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        inputRef.current.blur();
      }
    };

    const handleUnselect = React.useCallback(
      (option: Option) => {
        const newOptions = selected.filter((s) => s.value !== option.value);
        setSelected(newOptions);
        onChange?.(newOptions);
      },
      [onChange, selected]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = inputRef.current;
        if (input) {
          if (
            (e.key === 'Delete' || e.key === 'Backspace') &&
            input.value === '' &&
            selected.length > 0
          ) {
            const lastSelectOption = selected.at(-1);
            // If there is a last item and it is not fixed, we can remove it.
            if (lastSelectOption && !lastSelectOption.fixed) {
              handleUnselect(lastSelectOption);
            }
          }
          // This is not a default behavior of the <input /> field
          if (e.key === 'Escape') {
            input.blur();
          }
        }
      },
      [handleUnselect, selected]
    );

    useEffect(() => {
      if (open) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchend', handleClickOutside);
      } else {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchend', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchend', handleClickOutside);
      };
    }, [open]);

    useEffect(() => {
      if (!value) return;
      setSelected((prev) => {
        if (
          prev.length === value.length &&
          prev.every((item, index) => item.value === value[index]?.value)
        ) {
          return prev;
        }
        return value;
      });
    }, [value]);

    useEffect(() => {
      /** If `onSearch` or `onSearchPaginated` is provided, do not trigger options updated. */
      if (!arrayOptions || onSearch || onSearchPaginated) {
        return;
      }
      const newOption = transToGroupOption(arrayOptions ?? [], groupBy);
      if (JSON.stringify(newOption) !== JSON.stringify(options)) {
        setOptions(newOption);
      }
    }, [arrayDefaultOptions, arrayOptions, groupBy, onSearch, onSearchPaginated, options]);

    useEffect(() => {
      /** sync search */

      const doSearchSync = () => {
        const res = onSearchSync?.(debouncedSearchTerm);
        setOptions(transToGroupOption(res ?? [], groupBy));
      };

      const exec = async () => {
        if (!onSearchSync || !open) return;

        if (triggerSearchOnFocus) {
          doSearchSync();
        }

        if (debouncedSearchTerm) {
          doSearchSync();
        }
      };

      void exec();
    }, [debouncedSearchTerm, groupBy, open, triggerSearchOnFocus, onSearchSync]);

    useEffect(() => {
      /** async search (skip when using paginated) */
      if (onSearchPaginated) return;

      const doSearch = async () => {
        setIsLoading(true);
        const res = await onSearch?.(debouncedSearchTerm);
        setOptions(transToGroupOption(res ?? [], groupBy));
        setIsLoading(false);
      };

      const exec = async () => {
        if (!onSearch || !open) return;

        if (triggerSearchOnFocus) {
          await doSearch();
        }

        if (debouncedSearchTerm) {
          await doSearch();
        }
      };

      void exec();
    }, [debouncedSearchTerm, groupBy, open, triggerSearchOnFocus, onSearch, onSearchPaginated]);

    useEffect(() => {
      /** When using useInfiniteQuery: notify parent of search so it can refetch. */
      if (onSearchChange && open) {
        onSearchChange(debouncedSearchTerm);
      }
    }, [debouncedSearchTerm, open, onSearchChange]);

    useEffect(() => {
      /** paginated async search (callback mode): initial load and reset on search change */
      if (onLoadMore != null) return;

      const loadPage = async (search: string, page: number, append: boolean) => {
        const searchPaginated = onSearchPaginated;
        if (!searchPaginated) return;
        if (page === 1) setIsLoading(true);
        else setIsLoadingMore(true);
        try {
          const { options: nextOptions, hasMore } = await searchPaginated(search, page);
          if (paginatedOptions === undefined) {
            setOptions((prev) => {
              const flat = Object.values(prev).flat();
              const merged = append ? [...flat, ...nextOptions] : nextOptions;
              return transToGroupOption(merged, groupBy);
            });
          }
          setHasMorePaginated(hasMore);
          setPaginatedPage(page);
        } finally {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      };

      const exec = async () => {
        if (!onSearchPaginated || !open) return;
        setPaginatedPage(1);
        await loadPage(debouncedSearchTerm, 1, false);
      };

      void exec();
    }, [debouncedSearchTerm, open, onSearchPaginated, onLoadMore, paginatedOptions, groupBy]);

    const loadingMoreRef = React.useRef(false);
    const handlePaginatedScroll = React.useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (!nearBottom) return;

        if (onLoadMore != null) {
          if (hasMoreProp === false || loadingMoreRef.current) return;
          loadingMoreRef.current = true;
          void Promise.resolve(onLoadMore()).finally(() => {
            loadingMoreRef.current = false;
          });
          return;
        }

        if (!onSearchPaginated || !hasMorePaginated) return;
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setIsLoadingMore(true);
        void onSearchPaginated(debouncedSearchTerm, paginatedPage + 1)
          .then(({ options: nextOptions, hasMore }) => {
            if (paginatedOptions === undefined) {
              setOptions((prev) => {
                const flat = Object.values(prev).flat();
                return transToGroupOption([...flat, ...nextOptions], groupBy);
              });
            }
            setHasMorePaginated(hasMore);
            setPaginatedPage((p) => p + 1);
          })
          .finally(() => {
            setIsLoadingMore(false);
            loadingMoreRef.current = false;
          });
      },
      [
        onSearchPaginated,
        onLoadMore,
        hasMoreProp,
        hasMorePaginated,
        debouncedSearchTerm,
        paginatedPage,
        paginatedOptions,
        groupBy,
      ]
    );

    function CreatableItem() {
      if (!creatable) return;
      if (
        isOptionsExist(displayOptions, [{ value: inputValue, label: inputValue }]) ??
        selected.find((s) => s.value === inputValue)
      ) {
        return;
      }

      const Item = (
        <CommandItem
          value={inputValue}
          className="cursor-pointer"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onSelect={(value: string) => {
            if (selected.length >= maxSelected) {
              if (maxSelected === 1) {
                setInputValue('');
                const next = [{ value, label: value }];
                setSelected(next);
                onChange?.(next);
                return;
              }
              onMaxSelected?.(selected.length);
              return;
            }
            setInputValue('');
            const newOptions = [...selected, { value, label: value }];
            setSelected(newOptions);
            onChange?.(newOptions);
          }}>
          {`Create "${inputValue}"`}
        </CommandItem>
      );

      // For normal creatable
      if (!onSearch && inputValue.length > 0) {
        return Item;
      }

      // For async search creatable. avoid showing creatable item before loading at first.
      if (onSearch && debouncedSearchTerm.length > 0 && !isLoading) {
        return Item;
      }

      return;
    }

    const displayOptions = React.useMemo<GroupOption>(
      () =>
        paginatedOptions === undefined ? options : transToGroupOption(paginatedOptions, groupBy),
      [paginatedOptions, options, groupBy]
    );

    const EmptyItem = React.useCallback(() => {
      if (!emptyIndicator) return;

      // For async search that showing emptyIndicator
      if (onSearch && !creatable && Object.keys(displayOptions).length === 0) {
        return (
          <CommandItem value="-" disabled>
            {emptyIndicator}
          </CommandItem>
        );
      }

      return <CommandEmpty>{emptyIndicator}</CommandEmpty>;
    }, [creatable, emptyIndicator, onSearch, displayOptions]);

    const selectables = React.useMemo<GroupOption>(
      () => removePickedOption(displayOptions, selected),
      [displayOptions, selected]
    );

    /** Avoid Creatable Selector freezing or lagging when paste a long string. */
    const commandFilter = React.useCallback(() => {
      if (commandProps?.filter) {
        return commandProps.filter;
      }

      if (creatable) {
        return (value: string, search: string) => {
          return value.toLowerCase().includes(search.toLowerCase()) ? 1 : -1;
        };
      }
      // Using default filter in `cmdk`. We don't have to provide it.
      return;
    }, [creatable, commandProps?.filter]);

    return (
      <Command
        ref={dropdownRef}
        {...commandProps}
        onKeyDown={(e) => {
          handleKeyDown(e);
          commandProps?.onKeyDown?.(e);
        }}
        className={cn('h-auto overflow-visible bg-transparent', commandProps?.className)}
        shouldFilter={
          commandProps?.shouldFilter ?? (!onSearch && !onSearchPaginated && !onSearchChange)
        } // When using server-driven options, don't filter client-side. You can still override it.
        filter={commandFilter()}>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={cn(
            'border-input ring-offset-background focus-within:ring-ring flex items-start justify-between rounded-md border px-3 py-2 text-base focus-within:ring-2 focus-within:ring-offset-2 md:text-sm',
            {
              'cursor-text': !disabled && selected.length > 0,
            },
            className
          )}
          onClick={() => {
            if (disabled) return;
            inputRef?.current?.focus();
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef?.current?.focus();
            }
          }}>
          <div className="relative flex flex-wrap gap-1">
            {selected.map((option) => {
              return (
                <Badge
                  key={option.value}
                  className={cn(
                    'data-[disabled]:bg-muted-foreground data-[disabled]:text-muted data-[disabled]:hover:bg-muted-foreground',
                    'data-[fixed]:bg-muted-foreground data-[fixed]:text-muted data-[fixed]:hover:bg-muted-foreground',
                    badgeClassName
                  )}
                  data-fixed={option.fixed}
                  data-disabled={disabled ?? undefined}>
                  {option.label}
                  <button
                    type="button"
                    className={cn(
                      'ring-offset-background focus:ring-ring ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2',
                      (disabled ?? option.fixed) && 'hidden'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnselect(option);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(option)}>
                    <X className="h-3 w-3 cursor-pointer hover:text-white" />
                  </button>
                </Badge>
              );
            })}
            {/* Avoid having the "Search" Icon */}
            <CommandPrimitive.Input
              {...inputProps}
              ref={inputRef}
              value={inputValue}
              disabled={disabled}
              onValueChange={(value) => {
                setInputValue(value);
                inputProps?.onValueChange?.(value);
              }}
              onBlur={(event) => {
                if (!onScrollbar) {
                  setOpen(false);
                }
                inputProps?.onBlur?.(event);
              }}
              onFocus={(event) => {
                setOpen(true);
                inputProps?.onFocus?.(event);
              }}
              placeholder={hidePlaceholderWhenSelected && selected.length > 0 ? '' : placeholder}
              className={cn(
                'placeholder:text-muted-foreground flex-1 self-baseline bg-transparent outline-none',
                {
                  'w-full': hidePlaceholderWhenSelected,
                  'ml-1': selected.length > 0,
                },
                inputProps?.className
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(selected.filter((s) => s.fixed));
              onChange?.(selected.filter((s) => s.fixed));
            }}
            className={cn(
              'size-5',
              ((hideClearAllButton ?? false) ||
                (disabled ?? false) ||
                selected.length === 0 ||
                selected.filter((s) => s.fixed).length === selected.length) &&
                'hidden'
            )}>
            <X />
          </button>
          <ChevronDownIcon
            className={cn(
              'text-muted-foreground/50 size-5',
              ((hideClearAllButton ?? false) ||
                (disabled ?? false) ||
                selected.length > 0 ||
                selected.filter((s) => s.fixed).length !== selected.length) &&
                'hidden'
            )}
          />
        </div>
        <div className="relative">
          {open ? (
            <CommandList
              className="bg-popover text-popover-foreground animate-in absolute top-1 z-10 max-h-[300px] w-full rounded-md border shadow-md outline-none"
              onScroll={
                onSearchPaginated != null || onLoadMore != null ? handlePaginatedScroll : undefined
              }
              onMouseLeave={() => {
                setOnScrollbar(false);
              }}
              onMouseEnter={() => {
                setOnScrollbar(true);
              }}
              onMouseUp={() => {
                inputRef?.current?.focus();
              }}>
              {(isSearchLoadingProp ?? isLoading) ? (
                <div>{loadingIndicator}</div>
              ) : (
                <>
                  {EmptyItem()}
                  {CreatableItem()}
                  {!selectFirstItem && <CommandItem value="-" className="hidden" />}
                  {Object.entries(selectables).map(([key, dropdowns]) => (
                    <CommandGroup key={key} heading={key} className="h-full overflow-auto">
                      <>
                        {dropdowns.map((option) => {
                          return (
                            <CommandItem
                              key={option.value}
                              value={option.label}
                              disabled={option.disable}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onSelect={() => {
                                if (selected.length >= maxSelected) {
                                  if (maxSelected === 1) {
                                    setInputValue('');
                                    const next = [option];
                                    setSelected(next);
                                    onChange?.(next);
                                    return;
                                  }
                                  onMaxSelected?.(selected.length);
                                  return;
                                }
                                setInputValue('');
                                const newOptions = [...selected, option];
                                setSelected(newOptions);
                                onChange?.(newOptions);
                              }}
                              className={cn(
                                'cursor-pointer',
                                option.disable && 'text-muted-foreground cursor-default'
                              )}>
                              {option.label}
                            </CommandItem>
                          );
                        })}
                      </>
                    </CommandGroup>
                  ))}
                  {Boolean(onSearchPaginated && isLoadingMore) ||
                  Boolean(onLoadMore != null && isLoadingMoreProp) ? (
                    <div className="text-muted-foreground py-2 text-center text-sm">
                      Loading more...
                    </div>
                  ) : null}
                </>
              )}
            </CommandList>
          ) : null}
        </div>
      </Command>
    );
  }
);

MultipleSelector.displayName = 'MultipleSelector';
export default MultipleSelector;
