'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Filter, Loader2, X } from 'lucide-react';
import { Input } from '@/components/atoms/input';
import SectionShell from '@/components/molecules/public-site/section-shell';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { cn } from '@/lib/utils';
import { ICourseFilters } from '@/lib/types/course/ICourseFilters';
import { useSearchParams } from 'next/navigation';
import CourseCard from '../../../../../components/organs/course-card';
import { useFilteredCourses } from '@/lib/hooks/course/useCourses';
import { useLocale, useTranslations } from 'next-intl';
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
    <div className="bg-dz-paper text-dz-ink min-h-[60vh]">
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-dz-terracotta size-8 animate-spin" aria-hidden />
          </div>
        ) : courses.length > 0 ? (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-5">
              {courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={observerTarget} className="text-dz-ink-soft py-4 text-center text-sm">
              {isFetchingNextPage ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="text-dz-terracotta size-5 animate-spin" aria-hidden />
                  {t('loadingMoreCourses')}
                </span>
              ) : null}
              {hasNextPage ? null : <p className="m-0 py-2">{t('noMoreCourses')}</p>}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 py-20 text-center">
            <p className="text-dz-ink m-0 text-lg font-medium">{t('noCoursesFound')}</p>
            <p className="text-dz-ink-soft m-0 text-sm">{t('tryDifferentFilters')}</p>
          </div>
        )}
      </SectionShell>
    </div>
  );
}

export default CoursesHeaderSection;
