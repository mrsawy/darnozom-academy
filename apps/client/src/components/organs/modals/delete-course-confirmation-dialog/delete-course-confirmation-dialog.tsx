'use client';

import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

export interface DeleteCourseConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: { id: string; name: string } | null;
  deletingCourseId: string | null;
  onConfirmDelete: (courseId: string) => void;
}

export function DeleteCourseConfirmationDialog({
  open,
  onOpenChange,
  course,
  deletingCourseId,
  onConfirmDelete,
}: DeleteCourseConfirmationDialogProps) {
  const t = useTranslations('CourseDataTable');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        showCloseButton={false}
        onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <div
            className="bg-destructive/10 text-destructive mb-2 flex size-12 items-center justify-center rounded-full"
            aria-hidden>
            <IconAlertTriangle className="size-7" stroke={1.5} />
          </div>
          <DialogTitle>{t('dialogs.delete.title')}</DialogTitle>
          <DialogDescription>
            {course
              ? course.name
                ? t('dialogs.delete.description', { courseName: course.name })
                : t('dialogs.delete.descriptionNoName')
              : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              {t('buttons.cancel')}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={!course?.id || deletingCourseId === course.id}
            onClick={() => course && void onConfirmDelete(course.id)}>
            {t('dialogs.delete.confirmDelete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
