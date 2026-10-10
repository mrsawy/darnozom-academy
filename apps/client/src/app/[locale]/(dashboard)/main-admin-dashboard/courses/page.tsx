'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  useAdminCourses,
  useAdminUpdateCourse,
  useAdminDeleteCourse,
  useAdminSetCoursePublishStatus,
  useAdminSetCourseActiveStatus,
  useApproveCourse,
  useRejectCourse,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type { IReviewableCourse } from '@/lib/types/admin-review/admin-review.interface';
import { ApprovalStatusBadge } from '../__components/ApprovalStatusBadge';
import { ReviewDialog } from '../__components/ReviewDialog';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import { ActiveToggle } from '@/components/molecules/active-toggle';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { IconSearch } from '@tabler/icons-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminAllCoursesPage() {
  const t = useTranslations('AdminAllCoursesPage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError, refetch } = useAdminCourses({
    page,
    limit: 15,
    search: debouncedSearch || undefined,
  });

  const updateCourse = useAdminUpdateCourse();
  const deleteCourse = useAdminDeleteCourse();
  const setPublishStatus = useAdminSetCoursePublishStatus();
  const setActiveStatus = useAdminSetCourseActiveStatus();
  const approveCourse = useApproveCourse();
  const rejectCourse = useRejectCourse();

  const [editingCourse, setEditingCourse] = useState<IReviewableCourse | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', shortDescription: '' });
  const [reviewingCourse, setReviewingCourse] = useState<IReviewableCourse | null>(null);

  const openEdit = (course: IReviewableCourse) => {
    setEditingCourse(course);
    setEditForm({
      name: course.name,
      description: course.description ?? '',
      shortDescription: course.shortDescription ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCourse) return;
    await updateCourse.mutateAsync({ courseId: editingCourse._id, data: editForm });
    setEditingCourse(null);
  };

  const handleDelete = (course: IReviewableCourse) => {
    if (!globalThis.confirm(t('deleteConfirm'))) return;
    void deleteCourse.mutateAsync(course._id);
  };

  const handleApprove = async () => {
    if (!reviewingCourse) return;
    await approveCourse.mutateAsync(reviewingCourse._id);
    setReviewingCourse(null);
  };

  const handleReject = async (comment: string, deleteFiles: boolean) => {
    if (!reviewingCourse) return;
    await rejectCourse.mutateAsync({ itemId: reviewingCourse._id, comment, deleteFiles });
    setReviewingCourse(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-8"
        />
      </div>

      {isError ? (
        <div className="space-y-2 py-8 text-center">
          <p className="text-destructive">{t('error')}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {!isError && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('organization')}</TableHead>
                <TableHead>{t('instructor')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('publish')}</TableHead>
                <TableHead>{t('active')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="bg-muted h-4 animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (data?.docs ?? []).map((course) => (
                    <TableRow key={course._id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell>{course.organization?.name ?? course.organizationId}</TableCell>
                      <TableCell>
                        {course.instructor
                          ? `${course.instructor.firstName} ${course.instructor.lastName}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <ApprovalStatusBadge status={course.approvalStatus} />
                      </TableCell>
                      <TableCell>
                        <PublishToggle
                          publishStatus={course.publishStatus}
                          approvalStatus={course.approvalStatus}
                          isPending={setPublishStatus.isPending}
                          onToggle={(newStatus) =>
                            void setPublishStatus.mutateAsync({
                              courseId: course._id,
                              publishStatus: newStatus,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ActiveToggle
                          activeStatus={course.activeStatus}
                          isPending={setActiveStatus.isPending}
                          onToggle={(newStatus) =>
                            void setActiveStatus.mutateAsync({
                              courseId: course._id,
                              activeStatus: newStatus,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <span className="sr-only">{t('openMenu')}</span>⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEdit(course)}>
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setReviewingCourse(course)}>
                              {t('approve')} / {t('reject')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(course)}>
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-muted-foreground text-sm">
          {t('total', { count: data?.totalDocs ?? 0 })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.hasPrevPage}>
            <ChevronLeft className="h-4 w-4" />
            {t('previous')}
          </Button>
          <span className="text-muted-foreground text-sm">
            {t('pageOf', { page, totalPages: data?.totalPages ?? 1 })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.hasNextPage}>
            {t('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t('courseName')}</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('courseNamePlaceholder')}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('shortDescriptionLabel')}</Label>
              <Input
                value={editForm.shortDescription}
                onChange={(e) => setEditForm({ ...editForm, shortDescription: e.target.value })}
                placeholder={t('shortDescriptionPlaceholder')}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('descriptionLabel')}</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingCourse(null)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => void handleSaveEdit()}
              disabled={!editForm.name.trim() || updateCourse.isPending}>
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject dialog */}
      <ReviewDialog
        key={reviewingCourse?._id ?? 'closed'}
        open={!!reviewingCourse}
        onOpenChange={(open) => !open && setReviewingCourse(null)}
        itemName={reviewingCourse?.name ?? ''}
        onApprove={() => void handleApprove()}
        onReject={(comment, deleteFiles) => void handleReject(comment, deleteFiles)}
        isApproving={approveCourse.isPending}
        isRejecting={rejectCourse.isPending}
        pendingUpdate={reviewingCourse?.pendingUpdate}
        currentData={
          reviewingCourse
            ? { name: reviewingCourse.name, description: reviewingCourse.description }
            : undefined
        }
      />
    </div>
  );
}
