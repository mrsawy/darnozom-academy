'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/atoms/dialog';
import type { GradeResponse } from '@/lib/actions/grade/grade.action';
import { buildGradeFormSchema, type GradeFormValues } from './grade-form-dialog.schema';

interface GradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade?: GradeResponse | null;
  onSubmit: (values: GradeFormValues) => void;
  isSubmitting: boolean;
}

export function GradeFormDialog({
  open,
  onOpenChange,
  grade,
  onSubmit,
  isSubmitting,
}: GradeFormDialogProps) {
  const t = useTranslations('AdminGrades');
  const tVal = useTranslations('AdminGrades.validation');
  const isEdit = !!grade;

  const schema = useMemo(() => buildGradeFormSchema(tVal), [tVal]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GradeFormValues>({
    resolver: yupResolver(schema) as Resolver<GradeFormValues>,
    defaultValues: { nameEn: '', nameAr: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ nameEn: grade?.nameEn ?? '', nameAr: grade?.nameAr ?? '' });
    }
  }, [open, grade, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('form.editTitle') : t('form.createTitle')}</DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <Controller
            control={control}
            name="nameEn"
            render={({ field }) => (
              <div className="space-y-1">
                <Label htmlFor="grade-name-en">{t('form.nameEn')}</Label>
                <Input
                  id="grade-name-en"
                  {...field}
                  placeholder={t('form.nameEnPlaceholder')}
                  dir="ltr"
                />
                {errors.nameEn?.message ? (
                  <p className="text-destructive text-xs">{errors.nameEn.message}</p>
                ) : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name="nameAr"
            render={({ field }) => (
              <div className="space-y-1">
                <Label htmlFor="grade-name-ar">{t('form.nameAr')}</Label>
                <Input
                  id="grade-name-ar"
                  {...field}
                  placeholder={t('form.nameArPlaceholder')}
                  dir="rtl"
                />
                {errors.nameAr?.message ? (
                  <p className="text-destructive text-xs">{errors.nameAr.message}</p>
                ) : null}
              </div>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? t('form.save') : t('form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
