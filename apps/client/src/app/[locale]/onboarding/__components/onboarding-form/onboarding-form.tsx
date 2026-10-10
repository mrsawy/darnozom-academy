'use client';

import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/atoms/card';
import { Button } from '@/components/atoms/button';
import { Label } from '@/components/atoms/label';
import { Checkbox } from '@/components/atoms/checkbox';
import { Link } from '@/i18n/navigation';
import { ROUTE_TERMS, ROUTE_PRIVACY } from '@/lib/data/constants/routes.constants';
import { Combobox } from '@/components/molecules/combobox';
import { CURRENCIES, Roles, type Currency } from '@lms-organization/shared-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { AuthTextInput } from '@/app/[locale]/(auth)/__components/components/auth-text-input';
import { AuthPhoneInput } from '@/app/[locale]/(auth)/__components/components/auth-phone-input';
import { useCompleteOnboarding } from '@/lib/hooks/auth/use-onboarding.hook';
import {
  ONBOARDING_ROLES,
  buildOnboardingSchema,
  type OnboardingSchema,
} from './onboarding-form.schema';

interface OnboardingFormProps {
  /** Currency suggested from the visitor's IP country (see getRequestCurrency). */
  defaultCurrency: Currency;
}

export function OnboardingForm({ defaultCurrency }: OnboardingFormProps) {
  const t = useTranslations('onboarding');
  const tVal = useTranslations('onboarding.validation');
  const tRole = useTranslations('role');
  const [selectedRole, setSelectedRole] = useState<string>(Roles.STUDENT);
  const { mutate: submitOnboarding, isPending } = useCompleteOnboarding();

  const schema = useMemo(() => buildOnboardingSchema(tVal), [tVal]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingSchema>({
    // yupResolver infers required-but-undefined for conditional fields;
    // cast to satisfy react-hook-form's Resolver generic.
    resolver: yupResolver(schema) as unknown as Resolver<OnboardingSchema>,
    defaultValues: { roleName: Roles.STUDENT, phone: '', preferredCurrency: defaultCurrency },
  });

  const phone = watch('phone');
  const isOrg = (selectedRole as Roles) === Roles.SUPER_ADMIN;

  const onSubmit = (data: OnboardingSchema) => {
    submitOnboarding({
      roleName: data.roleName,
      phone: data.phone,
      preferredCurrency: data.preferredCurrency as Currency,
      ...(isOrg && data.organizationName
        ? {
            organizationDto: {
              name: data.organizationName,
              slug: data.organizationSlug ?? '',
            },
            acceptedTerms: data.acceptedTerms === true,
          }
        : {}),
    });
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="flex flex-col gap-5">
          {/* Role picker: student, parent, or organisation admin */}
          <div className="flex flex-col gap-2">
            <Label>{t('roleLabel')}</Label>
            <Combobox
              defaultValue={{ value: Roles.STUDENT, label: tRole('student') }}
              data={ONBOARDING_ROLES.map((r) => ({
                value: r,
                label: tRole(r.toLowerCase()),
              }))}
              title={t('roleLabel')}
              placeholder={t('rolePlaceholder')}
              onValueChange={(value) => {
                setSelectedRole(value);
                setValue('roleName', value);
              }}
            />
            {errors.roleName ? (
              <p className="text-sm text-red-400">{errors.roleName.message}</p>
            ) : null}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <AuthPhoneInput
              value={phone}
              onValueChange={(v) => setValue('phone', v)}
              error={errors.phone?.message}
            />
          </div>

          {/* Preferred currency (pre-selected from the visitor's IP country) */}
          <div className="flex flex-col gap-2">
            <Label>{t('currencyLabel')}</Label>
            <Select
              value={watch('preferredCurrency')}
              onValueChange={(v) => setValue('preferredCurrency', v, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('currencyPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.preferredCurrency ? (
              <p className="text-sm text-red-400">{errors.preferredCurrency.message}</p>
            ) : null}
          </div>

          {/* Organisation fields (org admin role only) */}
          {isOrg ? (
            <>
              <AuthTextInput
                label={t('orgNameLabel')}
                htmlFor="organizationName"
                placeholder={t('orgNamePlaceholder')}
                error={errors.organizationName?.message}
                {...register('organizationName')}
              />
              <AuthTextInput
                label={t('orgSlugLabel')}
                htmlFor="organizationSlug"
                placeholder={t('orgSlugPlaceholder')}
                error={errors.organizationSlug?.message}
                {...register('organizationSlug')}
              />

              <div className="flex flex-col gap-1">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={watch('acceptedTerms') ?? false}
                    onCheckedChange={(v) => setValue('acceptedTerms', v === true)}
                    className="mt-0.5"
                  />
                  <span className="*:[a]:text-primary *:[a]:underline *:[a]:underline-offset-4">
                    {t('acceptTermsPrefix')}{' '}
                    <Link href={ROUTE_TERMS} target="_blank">
                      {t('termsOfService')}
                    </Link>{' '}
                    {t('acceptTermsAnd')}{' '}
                    <Link href={ROUTE_PRIVACY} target="_blank">
                      {t('privacyPolicy')}
                    </Link>
                  </span>
                </label>
                {errors.acceptedTerms ? (
                  <p className="text-sm text-red-400">{errors.acceptedTerms.message}</p>
                ) : null}
              </div>
            </>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
