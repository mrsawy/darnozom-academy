'use client';

import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { useTranslations } from 'next-intl';
import { useUpdateChild } from '@/lib/hooks/parent/useParent.hook';
import { updateChildSchema, type UpdateChildSchema } from './child-form.schema';
import type { IChild } from '@/lib/types/parent/parent-children.interface';
import { PhoneInput } from '@/components/organs/phone-input';
import { Combobox } from '@/components/molecules/combobox';
import { Country } from '@darnozom/shared-types';

interface EditChildDialogProps {
  open: boolean;
  child: IChild | null;
  onClose: () => void;
}

export function EditChildDialog({ open, child, onClose }: EditChildDialogProps) {
  const t = useTranslations('ParentDashboard.children');
  const tCountry = useTranslations('Country');
  const { mutate: updateChild, isPending } = useUpdateChild({ onSuccess: onClose });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateChildSchema>({
    resolver: yupResolver(updateChildSchema) as Resolver<UpdateChildSchema>,
  });

  useEffect(() => {
    if (child) {
      reset({
        firstName: child.firstName ?? '',
        lastName: child.lastName ?? '',
        phone: child.phone,
        country: (child.country as Country) ?? Country.Egypt,
      });
    }
  }, [child, reset]);

  const onSubmit = (data: UpdateChildSchema) => {
    if (!child) return;
    updateChild({ childId: child._id, data });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editChildTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('form.username')}</Label>
              <Input value={child?.username ?? ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label>{t('form.email')}</Label>
              <Input value={child?.email ?? ''} disabled className="bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('form.firstName')}</Label>
              <Input {...register('firstName')} placeholder={t('form.firstNamePlaceholder')} />
              {errors.firstName ? (
                <p className="text-destructive text-xs">{errors.firstName.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>{t('form.lastName')}</Label>
              <Input {...register('lastName')} placeholder={t('form.lastNamePlaceholder')} />
              {errors.lastName ? (
                <p className="text-destructive text-xs">{errors.lastName.message}</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-1">
            <PhoneInput
              value={watch('phone')}
              onValueChange={(value) => setValue('phone', value)}
            />
            {errors.phone ? (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>{t('form.country')}</Label>
            <Combobox
              value={watch('country') ?? ''}
              data={Object.values(Country).map((c) => ({
                value: c,
                label: tCountry(c.toLowerCase()),
              }))}
              title={t('form.country')}
              placeholder={t('form.countryPlaceholder')}
              onValueChange={(value) => setValue('country', value as Country)}
            />
            {errors.country ? (
              <p className="text-destructive text-xs">{errors.country.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('form.saving') : t('form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
