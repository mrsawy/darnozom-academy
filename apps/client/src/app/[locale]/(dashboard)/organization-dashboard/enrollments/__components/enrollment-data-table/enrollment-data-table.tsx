'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { IEnrollment, SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/atoms/button';
import { IconFilter, IconLock, IconSearch } from '@tabler/icons-react';
import { Badge } from '@/components/atoms/badge';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { Progress } from '@/components/atoms/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  useEnrollmentsByOrganization,
  useToggleOrgEnrollmentSubscription,
} from '@/lib/hooks/enrollment/enrollments.hook';
import {
  getActiveSubscription,
  type ActiveSubscriptionResponse,
} from '@/lib/actions/subscription/subscription.action';
import { throwIfNatsError } from '@/lib/utils/natsErrorHandler';
import { useDebounce } from '@/lib/hooks/use-debounce';
import FiltersDrawer from '@/components/organs/filters-drawer/filters-drawer';
import { CourseMultiSelect } from '@/components/organs/select/course-multi-select';
import type { Option } from '@/components/molecules/multi-select/multi-select';
import { ROUTE_ORG_BILLING } from '@/lib/data/constants/routes.constants';
import { AddEnrollmentDialog } from '../add-enrollment-dialog/add-enrollment-dialog';
import { EnrollmentProgressDialog } from '../enrollment-progress-dialog/enrollment-progress-dialog';
import { EnrollmentSubscriptionDialog } from '../enrollment-subscription-dialog/enrollment-subscription-dialog';
import { EnrollmentRowActions } from '../enrollment-row-actions';
import {
  formatDate,
  getStatusBadgeVariant,
  subscriptionAllowsStudentProgress,
} from './enrollment-data-table.schema';

export function EnrollmentDataTable() {
  const t = useTranslations('EnrollmentDataTable');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftCourseOptions, setDraftCourseOptions] = useState<Option[]>([]);
  const [activeCourseOptions, setActiveCourseOptions] = useState<Option[]>([]);

  const [selectedEnrollment, setSelectedEnrollment] = useState<IEnrollment | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeCourseOptions]);

  const activeFilters = useMemo(() => {
    const courseIds = activeCourseOptions.map((o) => o.value).filter(Boolean);
    return courseIds.length > 0 ? { courseIds } : undefined;
  }, [activeCourseOptions]);

  const { data: enrollments, isLoading } = useEnrollmentsByOrganization(
    { page, limit: pageSize, search: debouncedSearch || undefined },
    activeFilters
  );

  const { data: activeSubscription, isPending: isSubscriptionPending } =
    useQuery<ActiveSubscriptionResponse | null>({
      queryKey: ['activeSubscription'],
      queryFn: async (): Promise<ActiveSubscriptionResponse | null> =>
        throwIfNatsError(await getActiveSubscription()),
    });

  const canViewStudentProgress = subscriptionAllowsStudentProgress(activeSubscription ?? undefined);
  const activeFilterCount = activeCourseOptions.length > 0 ? 1 : 0;
  const toggleOrgEnrollmentSubscription = useToggleOrgEnrollmentSubscription();

  const handleOpenProgressDialog = useCallback((enrollment: IEnrollment) => {
    setSelectedEnrollment(enrollment);
    setProgressDialogOpen(true);
  }, []);

  const handleOpenSubscriptionDialog = useCallback((enrollment: IEnrollment) => {
    setSelectedEnrollment(enrollment);
    setSubscriptionDialogOpen(true);
  }, []);

  const handleToggleAccess = useCallback(
    (enrollment: IEnrollment) => {
      void toggleOrgEnrollmentSubscription(
        enrollment,
        enrollment.subscription?.status === SubscriptionStatus.ACTIVE
          ? SubscriptionStatus.CANCELLED
          : SubscriptionStatus.ACTIVE
      );
    },
    [toggleOrgEnrollmentSubscription]
  );

  const handleApplyFilters = useCallback(() => {
    setActiveCourseOptions(draftCourseOptions);
    setFiltersOpen(false);
  }, [draftCourseOptions]);

  const handleResetFilters = useCallback(() => {
    setDraftCourseOptions([]);
    setActiveCourseOptions([]);
    setFiltersOpen(false);
  }, []);

  const handleOpenFilters = useCallback(() => {
    setDraftCourseOptions(activeCourseOptions);
    setFiltersOpen(true);
  }, [activeCourseOptions]);

  const columns: ColumnDef<IEnrollment>[] = useMemo(
    () => [
      {
        accessorKey: 'course',
        header: t('course'),
        enableHiding: false,
        cell: ({ row }) => {
          const course = row.original.course;
          return (
            <div className="flex w-[250px] items-center gap-3">
              {course?.thumbnailKey ? (
                <Image
                  src={getFileFullUrl(course.thumbnailKey)}
                  alt={course.name ?? t('courseThumbnail')}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <h3 className="truncate font-medium" title={course?.name ?? undefined}>
                  {course?.name ?? t('unknownCourse')}
                </h3>
                <p
                  className="truncate text-sm opacity-70"
                  title={course?.shortDescription ?? undefined}>
                  {course?.shortDescription}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'User',
        accessorFn: (row) => `${row?.user?.firstName} ${row?.user?.lastName} ${row?.user?.email}`,
        header: t('student'),
        cell: ({ row }) => (
          <div className="flex w-[250px] items-center justify-start gap-2">
            <Avatar className="shrink-0">
              <AvatarImage src={getFileFullUrl(row.original.user?.profile?.avatar)} />
              <AvatarFallback>
                {row.original.user?.firstName.slice(0, 1)}
                {row.original.user?.lastName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <span
                className="truncate"
                title={`${row.original.user?.firstName} ${row.original.user?.lastName}`}>
                {row.original.user?.firstName} {row.original.user?.lastName}
              </span>
              <span className="text-accent truncate" title={row.original.user?.email}>
                {row.original.user?.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'enrolledAt',
        header: t('enrolledAt'),
        cell: ({ row }) => <span>{formatDate(row.original.enrolledAt)}</span>,
      },
      {
        accessorKey: 'accessType',
        header: t('accessType'),
        cell: ({ row }) => {
          const at = row.original.accessType;
          const labelKey = `accessTypeLabels.${at}`;
          const label = t.has(labelKey) ? t(labelKey) : at;
          return <Badge variant="outline">{label}</Badge>;
        },
      },
      {
        accessorKey: 'progressPercentage',
        header: t('progress'),
        cell: ({ row }) => {
          if (isSubscriptionPending) {
            return <span className="text-muted-foreground px-2 text-xs">—</span>;
          }
          if (!canViewStudentProgress) {
            return (
              <div className="text-muted-foreground flex max-w-[200px] flex-col gap-1 px-2 text-xs">
                <span className="flex items-center gap-1">
                  <IconLock className="size-3.5 shrink-0" aria-hidden />
                  {t('progressLockedLabel')}
                </span>
                <Link
                  href={ROUTE_ORG_BILLING}
                  className="text-primary font-medium underline-offset-2 hover:underline">
                  {t('upgradeToViewProgress')}
                </Link>
              </div>
            );
          }
          const progress = row.original.progressPercentage;
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenProgressDialog(row.original)}
              className="h-auto w-full justify-start p-2 text-left">
              <div className="w-full space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </Button>
          );
        },
      },
      {
        accessorKey: 'subscription',
        header: t('subscription'),
        cell: ({ row }) => {
          const subscription = row.original.subscription;
          if (!subscription) {
            return <span className="opacity-70">{t('noSubscription')}</span>;
          }
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenSubscriptionDialog(row.original)}
              className="h-auto justify-start p-2 text-left">
              <Badge variant={getStatusBadgeVariant(subscription.status)}>
                {subscription.status}
              </Badge>
            </Button>
          );
        },
      },
      {
        accessorKey: 'certificate',
        header: t('certificate'),
        cell: ({ row }) => {
          const { issued } = row.original.certificate;
          return (
            <Badge variant={issued ? 'default' : 'secondary'}>
              {issued ? t('issued') : t('notIssued')}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: t('actions'),
        cell: ({ row }) => (
          <EnrollmentRowActions
            enrollment={row.original}
            onViewProgress={handleOpenProgressDialog}
            onViewSubscription={handleOpenSubscriptionDialog}
            onToggleAccess={handleToggleAccess}
          />
        ),
      },
    ],
    [
      t,
      handleOpenProgressDialog,
      handleOpenSubscriptionDialog,
      handleToggleAccess,
      isSubscriptionPending,
      canViewStudentProgress,
    ]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-5">
        <h2 className="text-xl font-medium">{t('title')}</h2>
        <AddEnrollmentDialog />
      </div>

      <div className="flex items-center space-x-2 p-5">
        <div className="relative ms-auto max-w-sm flex-1">
          <IconSearch className="absolute top-2.5 left-2 h-4 w-4 opacity-50" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenFilters}
          className={activeFilterCount > 0 ? 'border-primary text-primary' : ''}>
          <IconFilter className="h-4 w-4" />
          {t('filters')}
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {activeCourseOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-5">
          {activeCourseOptions.map((opt) => (
            <Badge key={opt.value} variant="secondary" className="gap-1 px-3 py-1 text-xs">
              <span className="text-muted-foreground">{t('course')}:</span>
              <span className="font-medium">{opt.label}</span>
              <button
                type="button"
                onClick={() => {
                  const updated = activeCourseOptions.filter((o) => o.value !== opt.value);
                  setActiveCourseOptions(updated);
                  setDraftCourseOptions(updated);
                }}
                className="ml-1 rounded-full hover:opacity-70"
                aria-label={`Remove ${opt.label} filter`}>
                ×
              </button>
            </Badge>
          ))}
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2 transition-colors">
            {t('resetFilters')}
          </button>
        </div>
      )}

      <FiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={t('filters')}
        applyLabel={t('applyFilters')}
        resetLabel={t('resetFilters')}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}>
        <div className="flex flex-col gap-6">
          <div>
            <Label className="mb-3 block font-medium">{t('filterByCourse')}</Label>
            <CourseMultiSelect
              value={draftCourseOptions}
              onChange={setDraftCourseOptions}
              placeholder={t('filterCoursesPlaceholder')}
            />
          </div>
        </div>
      </FiltersDrawer>

      <DataTable<IEnrollment>
        data={enrollments?.docs ?? []}
        columns={columns}
        getRowId={(row) => row._id?.toString() ?? ''}
        manualPagination
        pageCount={enrollments?.totalPages ?? 1}
        pagination={{ pageIndex: page - 1, pageSize }}
        onPaginationChange={({ pageIndex, pageSize: newSize }) => {
          setPage(pageIndex + 1);
          setPageSize(newSize);
        }}
        isLoading={isLoading}
      />

      <EnrollmentProgressDialog
        enrollment={selectedEnrollment}
        open={progressDialogOpen}
        onOpenChange={(open) => {
          setProgressDialogOpen(open);
          if (!open) setSelectedEnrollment(null);
        }}
      />

      <EnrollmentSubscriptionDialog
        enrollment={selectedEnrollment}
        open={subscriptionDialogOpen}
        onOpenChange={(open) => {
          setSubscriptionDialogOpen(open);
          if (!open) setSelectedEnrollment(null);
        }}
      />
    </div>
  );
}
