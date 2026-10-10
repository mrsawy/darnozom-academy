'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Filter, Loader2, X } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Badge } from '@/components/atoms/badge';
import { cn } from '@/lib/utils';
import { IInstructorFilters } from '@/lib/types/instructor/IInstructorFilters';
import { useSearchParams } from 'next/navigation';
import { IInstructor } from '@/lib/types/user/user.interface';
import InstructorCard4 from '../../../../../components/organs/instructor-card-4';
import { useTranslations, useLocale } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useInstructors } from '@/lib/hooks/instructor/useInstructors';
import { Typography } from '@/components/atoms/typography';
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
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.id} variant="secondary" className="gap-1 px-3 py-1 text-xs">
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="font-medium">{chip.value}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="ml-1 rounded-full hover:opacity-70"
            aria-label={`Remove ${chip.label} filter`}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2 transition-colors">
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
    <div className="min-h-screen">
      <div className="bg-gradient-dark border-lms-dark-accent border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-lms-text-primary mb-2 text-4xl font-bold">{t('title')}</h1>
          <p className="text-lms-text-secondary text-lg">{t('description')}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-lms-dark-secondary border-lms-dark-accent">
        <div className="container mx-auto px-4 py-6">
          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-center">
            <div className="relative w-full max-w-2xl flex-1">
              <Search className="text-lms-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={draftFilters.search ?? ''}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    search: e.target.value === '' ? undefined : e.target.value,
                  }))
                }
                className="bg-lms-dark-accent border-lms-dark-accent text-lms-text-primary placeholder:text-lms-text-muted pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                type="button"
                className={cn(activeFilterChips.length > 0 && 'border-primary text-primary')}>
                <Filter className="mr-2 h-4 w-4" />
                {t('filters')}
                {activeFilterChips.length > 0 && (
                  <span className="bg-primary text-primary-foreground ml-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
                    {activeFilterChips.length}
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Active filter chips — always visible */}
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

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Typography variant="p" color="muted" size="lg" weight="medium" className="mb-2">
                {t('errorLoadingInstructors')}
              </Typography>
              <Typography variant="p" color="muted" size="sm" className="opacity-70">
                {t('tryAgainLater')}
              </Typography>
            </div>
          ) : instructors.length > 0 ? (
            <>
              <div className="mx-auto grid max-w-7xl gap-8 pt-12 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {instructors.map((instructor) => (
                  <InstructorCard4 key={instructor._id} instructor={instructor} />
                ))}
              </div>
              <div ref={observerTarget} className="h-4 w-full" />
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-primary h-6 w-6 animate-spin" />
                  <Typography variant="span" color="muted" size="sm" className="ml-2">
                    {t('loadingMoreInstructors')}
                  </Typography>
                </div>
              ) : null}
              {!hasNextPage && (
                <Typography variant="p" color="muted" size="sm" align="center" className="py-4">
                  {t('noMoreInstructors')}
                </Typography>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Typography variant="p" color="muted" size="lg" weight="medium" className="mb-2">
                {t('noInstructorsFound')}
              </Typography>
              <Typography variant="p" color="muted" size="sm" className="opacity-70">
                {t('tryDifferentFilters')}
              </Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstructorsHeaderSection;
