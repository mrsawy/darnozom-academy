'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { useCreateTrainingCourse } from '@/lib/hooks/academics/use-academics.hook';
import { trainingCourseSchema } from './create-training-course-dialog.schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new training course id after it is created. */
  onCreated?: (courseId: string) => void;
}

export function CreateTrainingCourseDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useTranslations('Academics');
  const createCourse = useCreateTrainingCourse();
  const [name, setName] = useState('');
  const isValid = trainingCourseSchema.isValidSync({ name });

  const handleOpenChange = (next: boolean) => {
    if (next) setName('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createCourse.mutate(name.trim(), {
              onSuccess: (course) => {
                onOpenChange(false);
                onCreated?.(course._id);
              },
            });
          }}>
          <DialogHeader>
            <DialogTitle>{t('programs.newTrainingCourse')}</DialogTitle>
            <DialogDescription>{t('programs.trainingCourseHint')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="training-course-name">{t('name')}</Label>
            <Input
              id="training-course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('programs.trainingCourseNamePlaceholder')}
              maxLength={120}
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || createCourse.isPending}>
              {t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
