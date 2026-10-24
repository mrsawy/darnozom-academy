'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Filter, Loader2, X } from 'lucide-react';
import { Input } from '@/components/atoms/input';
import SectionShell from '@/components/molecules/public-site/section-shell';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { cn } from '@/lib/utils';
import { IInstructorFilters } from '@/lib/types/instructor/IInstructorFilters';
import { useSearchParams } from 'next/navigation';
import { IInstructor } from '@/lib/types/user/user.interface';
import InstructorCard4 from '../../../../../components/organs/instructor-card-4';
import { useTranslations, useLocale } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useInstructors } from '@/lib/hooks/instructor/useInstructors';
import { ROUTE_INSTRUCTORS } from '@/lib/data/constants/routes.constants';
import { useApprovedCategoryById } from '@/lib/hooks/category/use-category.hook';
import { useRouter } from '@/i18n/navigation';
import FiltersDrawer from '@/components/organs/filters-drawer/filters-drawer';
import {
  CategoryFilterField,
  RatingFilterField,
  GradeMultiFilterField,
  SchoolTypeMultiFilterField,
} from '@/components/organs/filters-drawer/filter-fields';
import { usePublicGrades } from '@/lib/hooks/grade/use-grades.hook';
import { usePublicSchoolTypes } from '@/lib/hooks/school-type/use-school-types.hook';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: IInstructorFilters = {
  page: 1,
  limit: 12,
  search: undefined,
  minRating: undefined,
  selectedCategory: undefined,
  gradeIds: undefined,
  schoolTypeIds: undefined,
};

function buildSearchParams(filters: IInstructorFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page') continue; // Never persist page (infinite scroll always starts at 1)
    if (value === undefined || value === null || value === '' || value === 0) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

function parseCsv(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const ids = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

function parseFiltersFromParams(
  searchParams: ReturnType<typeof useSearchParams>
): IInstructorFilters {
  const ratingParam = searchParams.get('minRating');
  return {
    page: 1,
    limit: 12,
    search: searchParams.get('search') ?? undefined,
    minRating: ratingParam ? Number(ratingParam) : undefined,
    selectedCategory: searchParams.get('selectedCategory') ?? undefined,
    gradeIds: parseCsv(searchParams.get('gradeIds')),
    schoolTypeIds: parseCsv(searchParams.get('schoolTypeIds')),
  };
}

// ---------------------------------------------------------------------------
// Active filter chip
// ---------------------------------------------------------------------------

interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
  t: (key: string) => string;
}

function ActiveFilterChips({ chips, onClearAll, t }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="bg-dz-sand text-dz-ink inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
          <span className="text-dz-ink-soft">{chip.label}:</span>
          <span className="font-semibold">{chip.value}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="hover:text-dz-terracotta cursor-pointer rounded-full transition-colors"
            aria-label={chip.label}>
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-dz-ink-soft hover:text-dz-ink cursor-pointer text-xs underline underline-offset-2 transition-colors">
        {t('resetFilters')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function InstructorsHeaderSection() {
  const t = useTranslations('Instructors');
  const [showFilters, setShowFilters] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active filters are always derived from URL
  const activeFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);

  // Draft filters for UI inputs (updated freely without triggering queries)
  const [draftFilters, setDraftFilters] = useState<IInstructorFilters>(activeFilters);

  // Sync draft back when URL changes externally (e.g. browser back/forward)
  useEffect(() => {
    setDraftFilters(parseFiltersFromParams(searchParams));
  }, [searchParams]);

  const debouncedSearch = useDebounce(draftFilters.search, 400);

  // Push debounced search to URL
  useEffect(() => {
    const currentSearch = searchParams.get('search') ?? undefined;
    const normalized = debouncedSearch === '' ? undefined : debouncedSearch;
    if (normalized !== currentSearch) {
      const params = buildSearchParams({
        ...parseFiltersFromParams(searchParams),
        search: normalized,
      });
      router.replace(`${ROUTE_INSTRUCTORS}${params ? `?${params}` : ''}`);
    }
  }, [debouncedSearch, searchParams, router]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInstructors(
      {
        ...activeFilters,
        page: 1,
      },
      12
    );

  const instructors: IInstructor[] = data?.pages.flatMap((page) => page.docs ?? []) ?? [];

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const navigateWithFilters = useCallback(
    (filters: IInstructorFilters) => {
      const params = buildSearchParams(filters);
      router.replace(`${ROUTE_INSTRUCTORS}${params ? `?${params}` : ''}`);
    },
    [router]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateWithFilters({ ...activeFilters, search: draftFilters.search });
  };

  const handleApplyFilters = () => {
    navigateWithFilters({
      ...activeFilters,
      minRating: draftFilters.minRating,
      selectedCategory: draftFilters.selectedCategory,
      gradeIds: draftFilters.gradeIds,
      schoolTypeIds: draftFilters.schoolTypeIds,
    });
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    router.replace(ROUTE_INSTRUCTORS);
  };

  const handleRemoveFilter = useCallback(
    (key: keyof IInstructorFilters) => {
      const updated = { ...activeFilters, [key]: undefined };
      setDraftFilters(updated);
      navigateWithFilters(updated);
    },
    [activeFilters, navigateWithFilters]
  );

  const handleRemoveArrayItem = useCallback(
    (key: 'gradeIds' | 'schoolTypeIds', id: string) => {
      const remaining = (activeFilters[key] ?? []).filter((value) => value !== id);
      const updated = { ...activeFilters, [key]: remaining.length > 0 ? remaining : undefined };
      setDraftFilters(updated);
      navigateWithFilters(updated);
    },
    [activeFilters, navigateWithFilters]
  );

  // ---------------------------------------------------------------------------
  // Active filter chips data
  // ---------------------------------------------------------------------------

  const { data: selectedCategoryData } = useApprovedCategoryById(
    activeFilters.selectedCategory ?? '',
    !!activeFilters.selectedCategory
  );

  const locale = useLocale();
  const { data: grades } = usePublicGrades();
  const { data: schoolTypes } = usePublicSchoolTypes();

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (activeFilters.search) {
      chips.push({
        id: 'search',
        label: t('filters'),
        value: `"${activeFilters.search}"`,
        onRemove: () => handleRemoveFilter('search'),
      });
    }
    if (activeFilters.minRating && activeFilters.minRating > 0) {
      chips.push({
        id: 'minRating',
        label: t('minimumRating'),
        value: `${activeFilters.minRating}+`,
        onRemove: () => handleRemoveFilter('minRating'),
      });
    }
    if (activeFilters.selectedCategory) {
      chips.push({
        id: 'selectedCategory',
        label: t('subject'),
        value: selectedCategoryData?.name ?? activeFilters.selectedCategory,
        onRemove: () => handleRemoveFilter('selectedCategory'),
      });
    }
    for (const id of activeFilters.gradeIds ?? []) {
      const grade = grades?.find((g) => g._id === id);
      chips.push({
        id: `grade-${id}`,
        label: t('grade'),
        value: grade ? (locale === 'ar' ? grade.nameAr : grade.nameEn) : id,
        onRemove: () => handleRemoveArrayItem('gradeIds', id),
      });
    }
    for (const id of activeFilters.schoolTypeIds ?? []) {
      const schoolType = schoolTypes?.find((s) => s._id === id);
      chips.push({
        id: `school-${id}`,
        label: t('schoolType'),
        value: schoolType ? (locale === 'ar' ? schoolType.nameAr : schoolType.nameEn) : id,
        onRemove: () => handleRemoveArrayItem('schoolTypeIds', id),
      });
    }
    return chips;
  }, [
    activeFilters,
    selectedCategoryData,
    grades,
    schoolTypes,
    locale,
    t,
    handleRemoveFilter,
    handleRemoveArrayItem,
  ]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-dz-paper text-dz-ink min-h-screen">
      <SectionShell tone="paper" innerClassName="flex flex-col gap-6 pb-10">
        <div className="flex max-w-[760px] flex-col gap-2.5">
          <DisplayHeading as="h1">{t('title')}</DisplayHeading>
          <p className="text-dz-ink-soft m-0 text-[17px] text-pretty">{t('description')}</p>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-2xl flex-1">
            <Search
              className="text-dz-ink-soft absolute start-3.5 top-1/2 size-4.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              placeholder={t('searchPlaceholder')}
              value={draftFilters.search ?? ''}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  search: e.target.value === '' ? undefined : e.target.value,
                }))
              }
              className="border-dz-line bg-dz-paper-raised h-11 rounded-full ps-11"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 self-start rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors sm:self-auto',
              activeFilterChips.length > 0
                ? 'border-dz-terracotta text-dz-terracotta'
                : 'border-dz-line-strong text-dz-ink hover:border-dz-ink'
            )}>
            <Filter className="size-4" aria-hidden />
            {t('filters')}
            {activeFilterChips.length > 0 ? (
              <span className="bg-dz-terracotta text-dz-paper-raised inline-flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold">
                {activeFilterChips.length}
              </span>
            ) : null}
          </button>
        </form>

        <ActiveFilterChips chips={activeFilterChips} onClearAll={handleResetFilters} t={t} />

        <FiltersDrawer
          open={showFilters}
          onOpenChange={setShowFilters}
          title={t('filters')}
          description={t('tryDifferentFilters')}
          applyLabel={t('applyFilters')}
          resetLabel={t('resetFilters')}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}>
          <div className="flex flex-col gap-6">
            <CategoryFilterField
              value={draftFilters.selectedCategory}
              onChange={(value) =>
                setDraftFilters((prev) => ({ ...prev, selectedCategory: value }))
              }
              label={t('subject')}
            />

            <GradeMultiFilterField
              value={draftFilters.gradeIds}
              onChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  gradeIds: value.length > 0 ? value : undefined,
                }))
              }
              label={t('grade')}
              placeholder={t('selectGrades')}
            />

            <SchoolTypeMultiFilterField
              value={draftFilters.schoolTypeIds}
              onChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  schoolTypeIds: value.length > 0 ? value : undefined,
                }))
              }
              label={t('schoolType')}
              placeholder={t('selectSchoolTypes')}
            />

            <RatingFilterField
              value={draftFilters.minRating}
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, minRating: value }))}
              label={t('minimumRating')}
            />
          </div>
        </FiltersDrawer>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-dz-terracotta size-8 animate-spin" aria-hidden />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-1 py-20 text-center">
            <p className="text-dz-ink m-0 text-lg font-medium">{t('errorLoadingInstructors')}</p>
            <p className="text-dz-ink-soft m-0 text-sm">{t('tryAgainLater')}</p>
          </div>
        ) : instructors.length > 0 ? (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-5">
              {instructors.map((instructor) => (
                <InstructorCard4 key={instructor._id} instructor={instructor} />
              ))}
            </div>
            <div ref={observerTarget} className="h-4 w-full" />
            {isFetchingNextPage ? (
              <div className="text-dz-ink-soft flex items-center justify-center gap-2 py-8 text-sm">
                <Loader2 className="text-dz-terracotta size-5 animate-spin" aria-hidden />
                {t('loadingMoreInstructors')}
              </div>
            ) : null}
            {hasNextPage ? null : (
              <p className="text-dz-ink-soft m-0 py-4 text-center text-sm">
                {t('noMoreInstructors')}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 py-20 text-center">
            <p className="text-dz-ink m-0 text-lg font-medium">{t('noInstructorsFound')}</p>
            <p className="text-dz-ink-soft m-0 text-sm">{t('tryDifferentFilters')}</p>
          </div>
        )}
      </SectionShell>
    </div>
  );
}

export default InstructorsHeaderSection;
