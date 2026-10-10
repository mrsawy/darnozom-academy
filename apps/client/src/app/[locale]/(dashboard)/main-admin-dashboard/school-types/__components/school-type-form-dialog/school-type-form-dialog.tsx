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
import type { SchoolTypeResponse } from '@/lib/actions/school-type/school-type.action';
import {
  buildSchoolTypeFormSchema,
  type SchoolTypeFormValues,
} from './school-type-form-dialog.schema';

interface SchoolTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolType?: SchoolTypeResponse | null;
  onSubmit: (values: SchoolTypeFormValues) => void;
  isSubmitting: boolean;
}

export function SchoolTypeFormDialog({
  open,
  onOpenChange,
  schoolType,
  onSubmit,
  isSubmitting,
}: SchoolTypeFormDialogProps) {
  const t = useTranslations('AdminSchoolTypes');
  const tVal = useTranslations('AdminSchoolTypes.validation');
  const isEdit = !!schoolType;

  const schema = useMemo(() => buildSchoolTypeFormSchema(tVal), [tVal]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolTypeFormValues>({
    resolver: yupResolver(schema) as Resolver<SchoolTypeFormValues>,
    defaultValues: { nameEn: '', nameAr: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ nameEn: schoolType?.nameEn ?? '', nameAr: schoolType?.nameAr ?? '' });
    }
  }, [open, schoolType, reset]);

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
                <Label htmlFor="school-type-name-en">{t('form.nameEn')}</Label>
                <Input
                  id="school-type-name-en"
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
                <Label htmlFor="school-type-name-ar">{t('form.nameAr')}</Label>
                <Input
                  id="school-type-name-ar"
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
