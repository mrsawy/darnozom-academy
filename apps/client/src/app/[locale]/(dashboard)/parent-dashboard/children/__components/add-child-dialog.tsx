'use client';

import { useForm } from 'react-hook-form';
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
import { useCreateChild } from '@/lib/hooks/parent/useParent.hook';
import { createChildSchema, type CreateChildSchema } from './child-form.schema';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { PhoneInput } from '@/components/organs/phone-input';
import { Combobox } from '@/components/molecules/combobox';
import { Country } from '@darnozom/shared-types';

interface AddChildDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddChildDialog({ open, onClose }: AddChildDialogProps) {
  const t = useTranslations('ParentDashboard.children');
  const tErrors = useTranslations('errors');
  const tCountry = useTranslations('Country');

  const { mutate: createChild, isPending } = useCreateChild({ onSuccess: onClose });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateChildSchema>({
    resolver: yupResolver(createChildSchema),
    defaultValues: { phone: '', country: Country.Egypt },
  });

  const onSubmit = (data: CreateChildSchema) => {
    createChild(data, {
      onError: (err) => {
        const translated = translateApiMessage(err.message, tErrors);
        void translated;
      },
    });
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
          <DialogTitle>{t('addChildTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
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
            <Label>{t('form.username')}</Label>
            <Input {...register('username')} placeholder={t('form.usernamePlaceholder')} />
            {errors.username ? (
              <p className="text-destructive text-xs">{errors.username.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>{t('form.email')}</Label>
            <Input type="email" {...register('email')} placeholder={t('form.emailPlaceholder')} />
            {errors.email ? (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            ) : null}
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
            <Label>{t('form.password')}</Label>
            <Input
              type="password"
              {...register('password')}
              placeholder={t('form.passwordPlaceholder')}
            />
            {errors.password ? (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>{t('form.country')}</Label>
            <Combobox
              defaultValue={{ value: Country.Egypt, label: tCountry(Country.Egypt.toLowerCase()) }}
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
              {isPending ? t('form.creating') : t('form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
