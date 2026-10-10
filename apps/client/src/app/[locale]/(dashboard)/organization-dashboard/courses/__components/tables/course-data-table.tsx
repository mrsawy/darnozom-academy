'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/molecules/data-table/data-table';
import { ICourse, PricingDetails } from '@/lib/types/course/course.interface';
import { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/atoms/button';
import { IconDotsVertical, IconSearch } from '@tabler/icons-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { PlusIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  ROUTE_ORG_COURSES_CREATE,
  ROUTE_ORG_COURSE_DETAILS,
  ROUTE_ORG_COURSE_MODULES,
} from '@/lib/data/constants/routes.constants';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { Badge } from '@/components/atoms/badge';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { ApprovalStatusBadge } from '@/app/[locale]/(dashboard)/main-admin-dashboard/__components/ApprovalStatusBadge';

import { ModulesCountCell } from '../modules/modules-count-cell';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { useTranslations } from 'next-intl';
import { Currency } from '@lms-organization/shared-types';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { deleteCourse } from '@/lib/actions/courses/getCourses.action';
import { toast } from 'react-toastify';
import useGeneralStore from '@/lib/store/generalStore';
import { useSetCoursePublishStatus } from '@/lib/hooks/course/usePublishStatus';
import { courseKeys, useCoursesByOrganization } from '@/lib/hooks/course/useCourses';
import { Paginated } from '@/lib/types/Paginated';
import { CoursePendingUpdateDialog } from '@/components/organs/modals/course-pending-update-dialog/course-pending-update-dialog';
import { DeleteCourseConfirmationDialog } from '@/components/organs/modals/delete-course-confirmation-dialog/delete-course-confirmation-dialog';
import { DiscussionDialog } from '@/components';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';

function CourseDataTable() {
  const t = useTranslations('CourseDataTable');
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState<string>('');
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [pricingDialogOpen, setPricingDialogOpen] = useState<boolean>(false);
  const [selectedCoursePricing, setSelectedCoursePricing] = useState<ICourse['pricing'] | null>(
    null
  );
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [rejectionReasonOpen, setRejectionReasonOpen] = useState<boolean>(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>('');
  const [pendingUpdateCourse, setPendingUpdateCourse] = useState<ICourse | null>(null);
  const [coursePendingDelete, setCoursePendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const {
    mutate: setPublishStatus,
    isPending: isPublishPending,
    variables: publishVariables,
  } = useSetCoursePublishStatus();

  const coursesListOptions = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: globalFilter.trim() || undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, globalFilter]
  );

  const coursesQuery = useCoursesByOrganization(coursesListOptions);
  const courses = useMemo(
    () =>
      coursesQuery.data ?? {
        docs: [],
        totalPages: 0,
        totalDocs: 0,
        limit: pagination.pageSize,
        page: pagination.pageIndex + 1,
        pagingCounter: 0,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      },
    [coursesQuery.data, pagination.pageIndex, pagination.pageSize]
  );
  const courseDocs = courses.docs;
  const isLoading = coursesQuery.isLoading;

  // Create a separate component for the drag handle
  // const DragHandle = React.memo(({ id }: { id: UniqueIdentifier }) => {
  //   const { attributes, listeners } = useSortable({ id });
  //   return (
  //     <Button {...attributes} {...listeners} variant="ghost" size="icon" className="text-muted-foreground size-7 hover:bg-transparent">
  //       <IconGripVertical className="text-muted-foreground size-3" />
  //       <span className="sr-only">{t('ariaLabels.dragToReorder')}</span>
  //     </Button>
  //   );
  // });

  // const deleteSelected = useCallback((_ids: string[]) => {
  // console.log({ ids })
  // setCourseList((prev) => prev.filter((course) => !ids.includes(course._id?.toString() ?? '')))
  // }, []);

  // Handle opening the dialog and initializing temp description
  const handleOpenDialog = useCallback(
    (courseId: string) => {
      const course = courseDocs.find((c) => c._id?.toString() === courseId);
      if (course) {
        setTempDescription(course.description ?? '');
        setOpenRowId(courseId);
      }
    },
    [courseDocs]
  );

  // Handle closing dialog and resetting temp state
  const handleCloseDialog = useCallback(() => {
    setOpenRowId(null);
    setTempDescription('');
  }, []);

  // Handle saving changes
  const handleSaveDescription = useCallback(
    (courseId: string) => {
      queryClient.setQueryData(
        [...courseKeys.organization(), coursesListOptions],
        (old: Paginated<ICourse> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            docs: old.docs.map((course) =>
              course._id?.toString() === courseId
                ? { ...course, description: tempDescription }
                : course
            ),
          };
        }
      );
      handleCloseDialog();
    },
    [tempDescription, handleCloseDialog, queryClient, coursesListOptions]
  );

  // Handle opening pricing dialog
  const handleOpenPricingDialog = useCallback((course: ICourse) => {
    setSelectedCoursePricing(course.pricing);
    setSelectedCourseName(course.name);
    setPricingDialogOpen(true);
  }, []);

  // Handle closing pricing dialog
  const handleClosePricingDialog = useCallback(() => {
    setPricingDialogOpen(false);
    setSelectedCoursePricing(null);
    setSelectedCourseName('');
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setCoursePendingDelete(null);
  }, []);

  const handleConfirmDeleteCourse = useCallback(
    async (courseId: string) => {
      if (!courseId) return;
      setCoursePendingDelete(null);
      useGeneralStore.setState({ generalIsLoading: true });
      setDeletingCourseId(courseId);
      try {
        await deleteCourse(courseId);
        await queryClient.invalidateQueries({ queryKey: courseKeys.organization() });
        toast.success(t('dialogs.delete.success'));
      } catch {
        toast.error(t('dialogs.delete.error'));
      } finally {
        setDeletingCourseId(null);
        useGeneralStore.setState({ generalIsLoading: false });
      }
    },
    [queryClient, t]
  );

  // Memoize columns to prevent re-renders
  const columns: ColumnDef<ICourse>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.courseName'),
        cell: ({ row }) => {
          return (
            <div className="flex w-[300px] items-center gap-3">
              {row.original.thumbnailKey ? (
                <Image
                  src={getFileFullUrl(row.original.thumbnailKey)}
                  alt={row.original.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : null}
              <div>
                <h3 className="w-[250px] truncate font-medium" title={row.original.name}>
                  {row.original.name}
                </h3>
                <p
                  className="text-muted-foreground w-[250px] truncate text-sm"
                  title={row.original.shortDescription ?? undefined}>
                  {row.original.shortDescription}
                </p>
              </div>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: 'description',
        header: t('columns.description'),
        cell: ({ row }) => {
          return (
            <Button
              variant="outline"
              onClick={() => handleOpenDialog(row.original._id?.toString() ?? '')}>
              {t('buttons.view')}
            </Button>
          );
        },
      },
      // {
      //   accessorKey: 'isPaid',
      //   header: t('columns.type'),
      //   cell: ({ row }) => {
      //     return (
      //       <Badge variant={row.original.isPaid ? 'default' : 'secondary'}>
      //         {row.original.isPaid ? t('badges.paid') : t('badges.free')}
      //       </Badge>
      //     );
      //   },
      // },
      {
        accessorKey: 'pricing',
        header: t('columns.price'),
        cell: ({ row }) => {
          if (!row.original.isPaid) {
            return <span className="font-medium text-green-600">{t('badges.free')}</span>;
          }

          const pricing = row.original.pricing;

          // Show the first available price in the pricing object, or '-' if not available
          const priceEntry: [string, PricingDetails] | undefined = Object.entries(pricing)[0] as
            | [string, PricingDetails]
            | undefined;
          if (priceEntry) {
            const [_key, value] = priceEntry;
            const typedValue = value;
            const currencyTranslation =
              typedValue.originalCurrency === Currency.EGP
                ? t('currency.egp')
                : typedValue.originalCurrency;

            return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenPricingDialog(row.original)}
                className="h-auto justify-start p-2 text-start">
                <div className="text-start">
                  <div className="font-medium">
                    {typedValue.originalPrice} {currencyTranslation}
                  </div>
                  {typedValue.priceUSD ? (
                    <div className="text-muted-foreground text-xs">
                      {typedValue.priceUSD.toFixed(2)} {t('currency.usd')}
                    </div>
                  ) : null}
                </div>
              </Button>
            );
          }

          return <span className="text-muted-foreground">-</span>;
        },
      },
      {
        accessorKey: 'stats',
        header: t('columns.enrollments'),
        cell: ({ row }) => {
          const enrollments = row.original.stats?.totalEnrollments ?? 0;
          return <span className="font-medium">{enrollments}</span>;
        },
      },
      {
        accessorKey: 'modulesIds',
        header: t('columns.modules'),
        cell: ({ row }) => {
          return <ModulesCountCell courseId={row.original._id?.toString() ?? ''} />;
        },
      },
      {
        id: 'discussions',
        header: t('columns.discussions'),
        cell: ({ row }) => (
          <DiscussionDialog
            type={DiscussionType.COURSE}
            courseId={row.original._id?.toString() ?? ''}
            entityTitle={row.original.name}
            canDeleteAny
          />
        ),
      },
      {
        accessorKey: 'publishStatus',
        header: t('columns.status'),
        cell: ({ row }) => {
          const course = row.original;
          return (
            <PublishToggle
              publishStatus={course.publishStatus}
              approvalStatus={course.approvalStatus}
              isPending={!!(isPublishPending && publishVariables?.courseId === course._id)}
              onToggle={(status) =>
                setPublishStatus({ courseId: course._id, publishStatus: status })
              }
            />
          );
        },
      },
      {
        accessorKey: 'approvalStatus',
        header: t('columns.approval'),
        cell: ({ row }) => {
          const status = row.original.approvalStatus;
          if (!status) return null;
          if (status === 'REJECTED') {
            return (
              <Button
                type="button"
                variant="ghost"
                className="my-auto p-0"
                onClick={() => {
                  setSelectedRejectionReason(row.original.approvalComment ?? '');
                  setRejectionReasonOpen(true);
                }}>
                <ApprovalStatusBadge
                  className="h-full w-full border-none px-4 text-lg"
                  status={status}
                />
              </Button>
            );
          }
          if (status === 'PENDING_UPDATE') {
            return (
              <Button
                type="button"
                className="my-auto h-8 p-0"
                onClick={() => setPendingUpdateCourse(row.original)}>
                <ApprovalStatusBadge
                  status={status}
                  className="text-accent-foreground w-full border-none text-lg"
                />
              </Button>
            );
          }
          return <ApprovalStatusBadge status={status} />;
        },
      },
      {
        id: 'actions',
        accessorKey: 'actions',
        header: t('columns.actions'),
        cell: ({ row }) => (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon">
                <IconDotsVertical />
                <span className="sr-only">{t('ariaLabels.openMenu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem asChild>
                <Link href={ROUTE_ORG_COURSE_DETAILS(row.original._id)} className="cursor-pointer">
                  {t('buttons.edit')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={ROUTE_ORG_COURSE_MODULES(row.original._id)}>
                  {t('buttons.manageModules')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={deletingCourseId === (row.original._id?.toString() ?? '')}
                onSelect={() => {
                  const id = row.original._id?.toString() ?? '';
                  const name = row.original.name ?? '';
                  setCoursePendingDelete({ id, name });
                }}>
                {t('buttons.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      handleOpenDialog,
      handleOpenPricingDialog,
      deletingCourseId,
      t,
      isPublishPending,
      publishVariables,
      setPublishStatus,
    ]
  );

  if (coursesQuery.error) {
    const err = coursesQuery.error;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-xl font-medium">{t('title')}</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-red-500">{t('errorLoadingCourses', { message: err.message })}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-5">
        <h2 className="text-xl font-medium">{t('title')}</h2>
        <div data-onboarding="org-create-course" className="inline-flex rounded-xl p-1.5">
          <Button asChild variant="default" size="default" className="h-10 px-5 text-sm shadow-md">
            <Link href={ROUTE_ORG_COURSES_CREATE} className="inline-flex cursor-pointer">
              <PlusIcon />
              {t('addCourse')}
            </Link>
          </Button>
        </div>
      </div>
      {/* Search Input */}
      <div className="flex items-center space-x-2 p-5">
        <div className="relative ms-auto max-w-sm flex-1">
          <IconSearch className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="pl-8"
          />
        </div>
      </div>

      <DataTable<ICourse>
        data={courseDocs}
        columns={columns}
        getRowId={(row) => row._id?.toString() ?? ''}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        isLoading={isLoading}
        pageSize={pagination.pageSize}
        manualPagination
        pageCount={courses.totalPages}
        pagination={pagination}
        onPaginationChange={setPagination}
        onChangeData={() => {
          // Server-driven list; pagination/search refetch via React Query
        }}
      />

      {/* Description Dialog */}
      <Dialog
        open={!!openRowId}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog();
          }
        }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.description.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.description.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('dialogs.description.label')}</label>
            <Textarea
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              placeholder={t('dialogs.description.placeholder')}
              className="w-full"
              rows={6}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleCloseDialog}>
                {t('buttons.cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => openRowId && handleSaveDescription(openRowId)}>
              {t('buttons.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Details Dialog */}
      <Dialog
        open={pricingDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClosePricingDialog();
          }
        }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.pricing.title')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.pricing.description', { courseName: selectedCourseName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCoursePricing && Object.entries(selectedCoursePricing).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(selectedCoursePricing).map(([billingCycle, pricingDetails]) => {
                  const typedPricingDetails = pricingDetails as PricingDetails;
                  const billingCycleKey = billingCycle as keyof typeof BillingCycle;
                  const billingCycleTranslation =
                    t(`billingCycles.${billingCycleKey}`) || billingCycle;
                  const currencyTranslation =
                    typedPricingDetails.originalCurrency === Currency.EGP
                      ? t('currency.egp')
                      : typedPricingDetails.originalCurrency;

                  return (
                    <div key={billingCycle} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold capitalize">
                          {t('dialogs.pricing.plan', { billingCycle: billingCycleTranslation })}
                        </h3>
                        <Badge variant="outline">{billingCycleTranslation}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-muted-foreground text-sm font-medium">
                            {t('dialogs.pricing.originalPrice')}
                          </label>
                          <p className="text-lg font-semibold">
                            {typedPricingDetails.originalPrice} {currencyTranslation}
                          </p>
                        </div>

                        {typedPricingDetails.priceUSD ? (
                          <div>
                            <label className="text-muted-foreground text-sm font-medium">
                              {t('dialogs.pricing.usdPrice')}
                            </label>
                            <p className="text-lg font-semibold">
                              ${typedPricingDetails.priceUSD.toFixed(2)} {t('currency.usd')}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {typedPricingDetails.discountPercentage ? (
                        <div className="mt-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              {t('dialogs.pricing.discountAvailable')}
                            </span>
                            <Badge variant="default" className="bg-green-600">
                              {typedPricingDetails.discountPercentage}% {t('dialogs.pricing.off')}
                            </Badge>
                          </div>

                          {typedPricingDetails.discountStartDate &&
                          typedPricingDetails.discountEndDate ? (
                            <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                              {t('dialogs.pricing.validFrom', {
                                startDate: new Date(
                                  typedPricingDetails.discountStartDate
                                ).toLocaleDateString(),
                                endDate: new Date(
                                  typedPricingDetails.discountEndDate
                                ).toLocaleDateString(),
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">{t('dialogs.pricing.noPricingInfo')}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleClosePricingDialog}>
                {t('buttons.close')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionReasonOpen} onOpenChange={setRejectionReasonOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.rejectionReason.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.rejectionReason.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('dialogs.rejectionReason.label')}</label>
            <p className="text-muted-foreground rounded-md border p-3 text-sm">
              {selectedRejectionReason || t('dialogs.rejectionReason.noReason')}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('buttons.close')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CoursePendingUpdateDialog
        open={!!pendingUpdateCourse}
        onOpenChange={(open) => {
          if (!open) setPendingUpdateCourse(null);
        }}
        course={pendingUpdateCourse}
      />

      <DeleteCourseConfirmationDialog
        open={!!coursePendingDelete}
        onOpenChange={(open) => {
          if (!open) handleCloseDeleteModal();
        }}
        course={coursePendingDelete}
        deletingCourseId={deletingCourseId}
        onConfirmDelete={(id) => {
          void handleConfirmDeleteCourse(id);
        }}
      />
    </div>
  );
}

export default CourseDataTable;
