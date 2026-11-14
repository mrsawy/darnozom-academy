'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/atoms/dialog';
import type { AgeRangeResponse } from '@/lib/actions/age-range/age-range.action';
import { buildAgeRangeFormSchema, type AgeRangeFormValues } from './age-range-form-dialog.schema';

interface AgeRangeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ageRange?: AgeRangeResponse | null;
  onSubmit: (values: AgeRangeFormValues) => void;
  isSubmitting: boolean;
}

export function AgeRangeFormDialog({ open, onOpenChange, ageRange, onSubmit, isSubmitting }: AgeRangeFormDialogProps) {
  const t = useTranslations('AdminAgeRanges');
  const tVal = useTranslations('AdminAgeRanges.validation');
  const isEdit = !!ageRange;

  const schema = useMemo(() => buildAgeRangeFormSchema(tVal), [tVal]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgeRangeFormValues>({
    resolver: yupResolver(schema) as Resolver<AgeRangeFormValues>,
    defaultValues: { nameEn: '', nameAr: '', minAge: 0, maxAge: null },
  });

  useEffect(() => {
    if (open) {
      reset({
        nameEn: ageRange?.nameEn ?? '',
        nameAr: ageRange?.nameAr ?? '',
        minAge: ageRange?.minAge ?? 0,
        maxAge: ageRange?.maxAge ?? null,
      });
    }
  }, [open, ageRange, reset]);

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
                <Label htmlFor="age-range-name-en">{t('form.nameEn')}</Label>
                <Input id="age-range-name-en" {...field} placeholder={t('form.nameEnPlaceholder')} dir="ltr" />
                {errors.nameEn?.message ? <p className="text-destructive text-xs">{errors.nameEn.message}</p> : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name="nameAr"
            render={({ field }) => (
              <div className="space-y-1">
                <Label htmlFor="age-range-name-ar">{t('form.nameAr')}</Label>
                <Input id="age-range-name-ar" {...field} placeholder={t('form.nameArPlaceholder')} dir="rtl" />
                {errors.nameAr?.message ? <p className="text-destructive text-xs">{errors.nameAr.message}</p> : null}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="minAge"
              render={({ field }) => (
                <div className="space-y-1">
                  <Label htmlFor="age-range-min-age">{t('form.minAge')}</Label>
                  <Input
                    id="age-range-min-age"
                    type="number"
                    min={0}
                    max={120}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                  {errors.minAge?.message ? <p className="text-destructive text-xs">{errors.minAge.message}</p> : null}
                </div>
              )}
            />
            <Controller
              control={control}
              name="maxAge"
              render={({ field }) => (
                <div className="space-y-1">
                  <Label htmlFor="age-range-max-age">{t('form.maxAge')}</Label>
                  <Input
                    id="age-range-max-age"
                    type="number"
                    min={0}
                    max={120}
                    placeholder={t('form.maxAgePlaceholder')}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                  {errors.maxAge?.message ? <p className="text-destructive text-xs">{errors.maxAge.message}</p> : null}
                </div>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
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
