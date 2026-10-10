'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Filter, Loader2, X } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Badge } from '@/components/atoms/badge';
import { cn } from '@/lib/utils';
import { ICourseFilters } from '@/lib/types/course/ICourseFilters';
import { useSearchParams } from 'next/navigation';
import CourseCard from '../../../../../components/organs/course-card';
import { useFilteredCourses } from '@/lib/hooks/course/useCourses';
import { useLocale, useTranslations } from 'next-intl';
import { Typography } from '@/components/atoms/typography';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { ROUTE_COURSES } from '@/lib/data/constants/routes.constants';
import { useApprovedCategoryById } from '@/lib/hooks/category/use-category.hook';
import { usePublicGrades } from '@/lib/hooks/grade/use-grades.hook';
import { usePublicSchoolTypes } from '@/lib/hooks/school-type/use-school-types.hook';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { useRouter } from '@/i18n/navigation';
import FiltersDrawer from '@/components/organs/filters-drawer/filters-drawer';
import {
  CategoryFilterField,
  ModulesFilterField,
  PriceRangeFilterField,
  RatingFilterField,
  GradeFilterField,
  SchoolTypeMultiFilterField,
} from '@/components/organs/filters-drawer/filter-fields';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: ICourseFilters = {
  page: 1,
  limit: 12,
};

function parseCsv(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const ids = value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

function buildCourseSearchParams(filters: ICourseFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || key === 'limit') continue;
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

function parseNumber(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseFiltersFromParams(searchParams: ReturnType<typeof useSearchParams>): ICourseFilters {
  const billingCycle = searchParams.get('billingCycle');
  const isBillingCycle =
    billingCycle === BillingCycle.MONTHLY ||
    billingCycle === BillingCycle.YEARLY ||
    billingCycle === BillingCycle.ONE_TIME;

  const schoolTypeIds =
    parseCsv(searchParams.get('schoolTypeIds')) ?? parseCsv(searchParams.get('schoolTypeId'));

  return {
    page: 1,
    limit: 12,
    search: searchParams.get('search') ?? undefined,
    selectedCategory: searchParams.get('selectedCategory') ?? undefined,
    gradeId: searchParams.get('gradeId') ?? undefined,
    schoolTypeIds,
    minRating: parseNumber(searchParams.get('minRating')),
    minPrice: parseNumber(searchParams.get('minPrice')),
    maxPrice: parseNumber(searchParams.get('maxPrice')),
    priceCurrency: searchParams.get('priceCurrency') ?? undefined,
    minModules: parseNumber(searchParams.get('minModules')),
    billingCycle: isBillingCycle ? billingCycle : undefined,
  };
}

// ---------------------------------------------------------------------------
// Active filter chips
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
  resetLabel: string;
}

function ActiveFilterChips({ chips, onClearAll, resetLabel }: ActiveFilterChipsProps) {
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
        {resetLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function CoursesHeaderSection() {
  const t = useTranslations('Courses');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);

  // Draft filters — editable in the filter panel before Apply
  const [draftFilters, setDraftFilters] = useState<ICourseFilters>(activeFilters);

  // Sync draft when URL changes externally (browser back/forward)
  useEffect(() => {
    setDraftFilters(parseFiltersFromParams(searchParams));
  }, [searchParams]);

  const debouncedSearch = useDebounce(draftFilters.search, 400);

  // Push debounced search to URL
  useEffect(() => {
    const currentSearch = searchParams.get('search') ?? undefined;
    const normalized = debouncedSearch === '' ? undefined : debouncedSearch;
    if (normalized !== currentSearch) {
      const params = buildCourseSearchParams({
        ...activeFilters,
        search: normalized,
      });
      router.replace(`${ROUTE_COURSES}${params ? `?${params}` : ''}`);
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFilteredCourses(
    activeFilters,
    12
  );

  const courses = data?.pages.flatMap((p) => p.docs ?? []) ?? [];

  // Infinite scroll
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

  const navigateWithFilters = (filters: ICourseFilters) => {
    const params = buildCourseSearchParams(filters);
    router.replace(`${ROUTE_COURSES}${params ? `?${params}` : ''}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateWithFilters({ ...activeFilters, search: draftFilters.search });
  };

  const handleApplyFilters = () => {
    navigateWithFilters({ ...activeFilters, ...draftFilters, page: 1, limit: 12 });
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    router.replace(ROUTE_COURSES);
  };

  const handleRemoveFilter = (key: keyof ICourseFilters) => {
    const updated = { ...activeFilters, [key]: undefined };
    setDraftFilters(updated);
    navigateWithFilters(updated);
  };

  const handleRemoveSchoolType = (id: string) => {
    const remaining = (activeFilters.schoolTypeIds ?? []).filter((value) => value !== id);
    const updated = {
      ...activeFilters,
      schoolTypeIds: remaining.length > 0 ? remaining : undefined,
    };
    setDraftFilters(updated);
    navigateWithFilters(updated);
  };

  // ---------------------------------------------------------------------------
  // Active filter chips data
  // ---------------------------------------------------------------------------

  const { data: selectedCategoryData } = useApprovedCategoryById(
    activeFilters.selectedCategory ?? '',
    !!activeFilters.selectedCategory
  );

  const { data: grades } = usePublicGrades();
  const { data: schoolTypes } = usePublicSchoolTypes();

  const selectedGradeName = useMemo(() => {
    const grade = grades?.find((g) => g._id === activeFilters.gradeId);
    return grade ? (isArabic ? grade.nameAr : grade.nameEn) : undefined;
  }, [grades, activeFilters.gradeId, isArabic]);

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (activeFilters.search) {
      chips.push({
        id: 'search',
        label: t('search'),
        value: `"${activeFilters.search}"`,
        onRemove: () => handleRemoveFilter('search'),
      });
    }
    if (activeFilters.selectedCategory) {
      chips.push({
        id: 'selectedCategory',
        label: t('category'),
        value: selectedCategoryData?.name ?? activeFilters.selectedCategory,
        onRemove: () => handleRemoveFilter('selectedCategory'),
      });
    }
    if (activeFilters.gradeId && selectedGradeName) {
      chips.push({
        id: 'gradeId',
        label: t('grade'),
        value: selectedGradeName,
        onRemove: () => handleRemoveFilter('gradeId'),
      });
    }
    for (const id of activeFilters.schoolTypeIds ?? []) {
      const schoolType = schoolTypes?.find((s) => s._id === id);
      chips.push({
        id: `schoolType-${id}`,
        label: t('schoolType'),
        value: schoolType ? (isArabic ? schoolType.nameAr : schoolType.nameEn) : id,
        onRemove: () => handleRemoveSchoolType(id),
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
    if (activeFilters.minPrice && activeFilters.minPrice > 0) {
      chips.push({
        id: 'minPrice',
        label: t('price'),
        value: `${activeFilters.minPrice}–${activeFilters.maxPrice ?? 5000} ${activeFilters.priceCurrency ?? ''}`,
        onRemove: () => handleRemoveFilter('minPrice'),
      });
    }
    if (activeFilters.minModules && activeFilters.minModules > 0) {
      chips.push({
        id: 'minModules',
        label: t('minimumModules'),
        value: `${activeFilters.minModules}+`,
        onRemove: () => handleRemoveFilter('minModules'),
      });
    }
    if (activeFilters.billingCycle) {
      chips.push({
        id: 'billingCycle',
        label: t('billingCycle'),
        value:
          activeFilters.billingCycle === BillingCycle.ONE_TIME
            ? t('oneTime')
            : activeFilters.billingCycle.charAt(0).toUpperCase() +
              activeFilters.billingCycle.slice(1),
        onRemove: () => handleRemoveFilter('billingCycle'),
      });
    }
    return chips;
  }, [activeFilters, selectedCategoryData, selectedGradeName, schoolTypes, isArabic, t]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-[60vh]">
      <div className="bg-gradient-dark border-lms-dark-accent border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-lms-text-primary mb-2 text-4xl font-bold">{t('title')}</h1>
          <p className="text-lms-text-secondary text-lg">{t('description')}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-lms-dark-secondary border-lms-dark-accent border-b">
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
          <ActiveFilterChips
            chips={activeFilterChips}
            onClearAll={handleResetFilters}
            resetLabel={t('resetFilters')}
          />

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
                label={t('category')}
              />

              <GradeFilterField
                value={draftFilters.gradeId}
                onChange={(value) => setDraftFilters((prev) => ({ ...prev, gradeId: value }))}
                label={t('grade')}
                allLabel={t('allGrades')}
                placeholder={t('searchPlaceholder')}
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
                placeholder={t('searchPlaceholder')}
              />

              <PriceRangeFilterField
                minPrice={draftFilters.minPrice}
                maxPrice={draftFilters.maxPrice}
                priceCurrency={draftFilters.priceCurrency}
                billingCycle={draftFilters.billingCycle}
                onPriceChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    minPrice: value.minPrice,
                    maxPrice: value.maxPrice,
                  }))
                }
                onCurrencyChange={(value) =>
                  setDraftFilters((prev) => ({ ...prev, priceCurrency: value }))
                }
                onBillingCycleChange={(value) =>
                  setDraftFilters((prev) => ({ ...prev, billingCycle: value }))
                }
                labels={{
                  priceRange: t('priceRange'),
                  billingCycle: t('billingCycle'),
                  currency: t('currency'),
                  oneTime: t('oneTime'),
                }}
              />

              <RatingFilterField
                value={draftFilters.minRating}
                onChange={(value) => setDraftFilters((prev) => ({ ...prev, minRating: value }))}
                label={t('minimumRating')}
              />

              <ModulesFilterField
                value={draftFilters.minModules}
                onChange={(value) => setDraftFilters((prev) => ({ ...prev, minModules: value }))}
                label={t('minimumModules')}
              />
            </div>
          </FiltersDrawer>

          {/* Results grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : courses.length > 0 ? (
            <>
              <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2 pt-12 lg:grid-cols-3 lg:gap-8">
                {courses.map((course) => (
                  <CourseCard key={course._id} course={course} />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={observerTarget} className="py-4 text-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="text-primary h-6 w-6 animate-spin" />
                    <Typography variant="span" color="muted" size="sm">
                      {t('loadingMoreCourses')}
                    </Typography>
                  </div>
                ) : null}
                {!hasNextPage && (
                  <Typography variant="p" color="muted" size="sm" align="center" className="py-2">
                    {t('noMoreCourses')}
                  </Typography>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Typography variant="p" color="muted" size="lg" weight="medium" className="mb-2">
                {t('noCoursesFound')}
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

export default CoursesHeaderSection;
