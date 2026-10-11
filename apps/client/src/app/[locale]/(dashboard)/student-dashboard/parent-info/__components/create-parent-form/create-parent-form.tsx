'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useMutation, useQueryClient } from '@/lib/utils';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { PasswordInput } from '@/components/atoms/password-input';
import { Label } from '@/components/atoms/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Combobox } from '@/components/molecules/combobox';
import { PhoneInput } from '@/components/organs/phone-input';
import { IconLoader2, IconUserPlus } from '@tabler/icons-react';
import { Country } from '@darnozom/shared-types';
import { createParentForStudent } from '@/lib/actions/parent/parent-children.action';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { buildCreateParentSchema, type CreateParentFormValues } from './create-parent-form.schema';
import useUserStore from '@/lib/store/userStore';

function countryFromStudentProfile(country?: string): Country {
  if (country && (Object.values(Country) as string[]).includes(country)) {
    return country as Country;
  }
  return Country.Egypt;
}

export function CreateParentForm() {
  const t = useTranslations('StudentDashboard.parentInfo');
  const tCountry = useTranslations('Country');
  const tErrors = useTranslations('errors');
  const queryClient = useQueryClient();
  const user = useUserStore((s) => s.user);

  const studentDefaultCountry = useMemo(
    () => countryFromStudentProfile(user?.profile?.address?.country),
    [user?.profile?.address?.country]
  );

  const schema = useMemo(
    () =>
      buildCreateParentSchema((key, values) => t(`form.${key}`, values as Record<string, string>)),
    [t]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateParentFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { phone: '', country: studentDefaultCountry },
  });

  useEffect(() => {
    setValue('country', studentDefaultCountry);
  }, [studentDefaultCountry, setValue]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateParentFormValues) => {
      const { confirmPassword: _confirm, ...dto } = data;
      return createParentForStudent(dto);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'parentData'] });
      toast.success(translateApiMessage('parentCreatedSuccessfully', tErrors));
    },
    onError: (err: Error) => {
      toast.error(translateApiMessage(err.message, tErrors));
    },
  });

  const onSubmit = (data: CreateParentFormValues) => {
    mutate(data);
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-2">
            <IconUserPlus className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('createParent')}</CardTitle>
            <CardDescription className="mt-1">{t('createParentDescription')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">{t('form.firstName')}</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName ? (
                <p className="text-destructive text-xs">{errors.firstName.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t('form.lastName')}</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName ? (
                <p className="text-destructive text-xs">{errors.lastName.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="username">{t('form.username')}</Label>
            <Input id="username" {...register('username')} />
            {errors.username ? (
              <p className="text-destructive text-xs">{errors.username.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">{t('form.email')}</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email ? (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <PhoneInput
              label={t('form.phone')}
              value={watch('phone')}
              onValueChange={(value) => setValue('phone', value)}
            />
            {errors.phone ? (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">{t('form.password')}</Label>
            <PasswordInput id="password" {...register('password')} />
            {errors.password ? (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">{t('form.confirmPassword')}</Label>
            <PasswordInput id="confirmPassword" {...register('confirmPassword')} />
            {errors.confirmPassword ? (
              <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label>{t('form.country')}</Label>
            <Combobox
              defaultValue={{
                value: studentDefaultCountry,
                label: tCountry(studentDefaultCountry.toLowerCase()),
              }}
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

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                {t('form.submit')}
              </>
            ) : (
              t('form.submit')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
