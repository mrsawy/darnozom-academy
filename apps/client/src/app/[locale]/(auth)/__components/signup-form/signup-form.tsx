'use client';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/atoms/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';
import { Checkbox } from '@/components/atoms/checkbox';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/atoms/label';
import { buildSignupSchema, type SignupSchema } from './signup-form.schema';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'react-toastify';
import { UserMainRoles } from '@/lib/data/userRole.enum';
import Image from 'next/image';
import { handleSignup } from '@/lib/actions/auth/auth.action';
import useGeneralStore from '@/lib/store/generalStore';
import { Link, useRouter } from '@/i18n/navigation';
import { Combobox } from '@/components/molecules/combobox';
import { getLocalWishlistCourseIds, clearLocalWishlist } from '@/lib/utils/localStorageWishlist';
import { Country, Roles } from '@darnozom/shared-types';
import { useTranslations } from 'next-intl';
import { AuthTextInput, AuthPasswordInput, AuthPhoneInput, GoogleAuthButton } from '../components';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import {
  ROUTE_LOGIN,
  ROUTE_TERMS,
  ROUTE_PRIVACY,
  ROUTE_ORGANIZATION_VERIFICATION,
} from '@/lib/data/constants/routes.constants';

export function SignupForm({
  redirectUrl,
  onSuccess,
  className,
  onLoginClick,
  withImage = true,
  ...props
}: React.ComponentProps<'form'> & {
  redirectUrl?: string;
  onLoginClick?: () => void;
  onSuccess?: () => void;
  withImage?: boolean;
}) {
  const t = useTranslations('auth.signup');
  const tVal = useTranslations('auth.signup.validation');
  const tRole = useTranslations('role');
  const tCountry = useTranslations('Country');
  const tCommon = useTranslations('auth.common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const schema = useMemo(() => buildSignupSchema(tVal), [tVal]);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      roleName: UserMainRoles.STUDENT,
      country: Country.Egypt,
    },
  });

  const selectedRole = watch('roleName');

  const onSubmit = async (data: SignupSchema) => {
    try {
      useGeneralStore.setState({ generalIsLoading: true });

      const wishlistCourseIds = getLocalWishlistCourseIds();

      const response = await handleSignup(
        data,
        wishlistCourseIds.length > 0 ? wishlistCourseIds : undefined
      );
      if ('err' in response) {
        if (response.err.message.includes('username')) {
          return setError('username', { message: tErrors('usernameTaken') });
        }
        if (response.err.message.includes('email')) {
          return setError('email', { message: tErrors('emailAlreadyRegistered') });
        }
        if (response.err.message.includes('phone')) {
          return setError('phoneNumber', { message: tErrors('phoneTaken') });
        }
        return toast.error(translateApiMessage(response.err.message, tErrors));
      }

      if (wishlistCourseIds.length > 0) {
        clearLocalWishlist();
      }

      onSuccess?.();
      // Newly-registered orgs must clear the verification wizard + admin approval
      // before the dashboard; send them straight there.
      if (response.user.roleName === Roles.SUPER_ADMIN) {
        router.push(ROUTE_ORGANIZATION_VERIFICATION);
        return;
      }
      // Dialog hosts handle post-auth (e.g. resume enrollment) — stay on the page.
      if (onSuccess) return;
      router.push(redirectUrl ?? getDashboardUrl(response.user.roleName));
    } catch {
      setError('root', { message: tErrors('somethingWentWrong') });
      toast.error(tErrors('somethingWentWrong'));
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="overflow-hidden p-0">
        <CardContent
          className={cn('grid gap-6 p-5', withImage ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className={cn('flex flex-col gap-6 lg:p-4', className)}
            {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground text-sm text-balance">{t('subtitle')}</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between gap-2">
                <AuthTextInput
                  label={t('firstName')}
                  htmlFor="firstName"
                  placeholder={t('firstNamePlaceholder')}
                  error={errors.firstName?.message}
                  className="w-full"
                  {...register('firstName')}
                />
                <AuthTextInput
                  label={t('lastName')}
                  htmlFor="lastName"
                  placeholder={t('lastNamePlaceholder')}
                  error={errors.lastName?.message}
                  className="w-full"
                  {...register('lastName')}
                />
              </div>

              <AuthTextInput
                label={t('email')}
                htmlFor="email"
                placeholder={t('emailPlaceholder')}
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="flex flex-col justify-between gap-2 lg:flex-row">
                <AuthTextInput
                  label={t('username')}
                  htmlFor="username"
                  placeholder={t('usernamePlaceholder')}
                  error={errors.username?.message}
                  className="w-full flex-col gap-1"
                  {...register('username')}
                />
                <AuthPhoneInput
                  value={watch('phoneNumber')}
                  onValueChange={(value) => setValue('phoneNumber', value)}
                  error={errors.phoneNumber?.message}
                />
              </div>

              <div className="flex justify-between gap-2">
                <div className="flex w-full flex-col gap-2">
                  <Label htmlFor="country" className="lg:text-medium text-sm">
                    {t('country')}
                  </Label>
                  <Combobox
                    defaultValue={{
                      value: Country.Egypt,
                      label: tCountry(Country.Egypt.toLowerCase()),
                    }}
                    data={Object.values(Country).map((c) => ({
                      value: c,
                      label: tCountry(c.toLowerCase()),
                    }))}
                    title={t('selectCountry')}
                    placeholder={t('countryPlaceholder')}
                    onValueChange={(value) => setValue('country', value as Country)}
                  />
                  {errors.country ? (
                    <p className="text-left text-sm text-red-400">{errors.country?.message}</p>
                  ) : null}
                </div>

                <div className="flex w-full flex-col gap-2">
                  <Label className="lg:text-medium text-sm" htmlFor="role">
                    {t('userType')}
                  </Label>
                  <Combobox
                    defaultValue={{
                      value: UserMainRoles.STUDENT,
                      label: tRole(UserMainRoles.STUDENT.toLowerCase()),
                    }}
                    data={Object.values(UserMainRoles).map((c) => ({
                      value: c,
                      label: tRole(c.toLowerCase()),
                    }))}
                    title={t('userRole')}
                    placeholder={t('rolePlaceholder')}
                    onValueChange={(value) => setValue('roleName', value as UserMainRoles)}
                  />
                  {errors.roleName ? (
                    <p className="text-left text-sm text-red-400">{errors.roleName?.message}</p>
                  ) : null}
                </div>
              </div>

              <AuthPasswordInput
                label={t('password')}
                htmlFor="password"
                placeholder={t('passwordPlaceholder')}
                error={errors.password?.message}
                {...register('password')}
              />

              {selectedRole === UserMainRoles.ORGANIZATION && (
                <>
                  <AuthTextInput
                    label={t('organizationName')}
                    htmlFor="organizationName"
                    placeholder={t('organizationNamePlaceholder')}
                    error={errors.organizationName?.message}
                    {...register('organizationName')}
                  />
                  <AuthTextInput
                    label={t('organizationSlug')}
                    htmlFor="organizationSlug"
                    placeholder={t('organizationSlugPlaceholder')}
                    error={errors.organizationSlug?.message}
                    {...register('organizationSlug')}
                  />
                </>
              )}
              <div className="flex flex-col gap-1">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={watch('acceptedTerms') ?? false}
                    onCheckedChange={(v) =>
                      setValue('acceptedTerms', v === true, { shouldValidate: true })
                    }
                    className="mt-0.5"
                  />
                  <span className="*:[a]:text-primary *:[a]:underline *:[a]:underline-offset-4">
                    {t('acceptTermsPrefix')}{' '}
                    <Link href={ROUTE_TERMS} target="_blank">
                      {tCommon('termsOfService')}
                    </Link>{' '}
                    {t('acceptTermsAnd')}{' '}
                    <Link href={ROUTE_PRIVACY} target="_blank">
                      {tCommon('privacyPolicy')}
                    </Link>
                  </span>
                </label>
                {errors.acceptedTerms ? (
                  <p className="text-left text-sm text-red-400">{errors.acceptedTerms.message}</p>
                ) : null}
              </div>

              <Button type="submit" className="w-full">
                {t('submit')}
              </Button>
              {errors.root ? (
                <p className="m-auto text-left text-sm text-red-400">{errors.root?.message}</p>
              ) : null}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card text-muted-foreground px-2">
                    {tCommon('orContinueWith')}
                  </span>
                </div>
              </div>

              <GoogleAuthButton />
            </div>
            <div className="text-center text-sm">
              {t('alreadyHaveAccount')}{' '}
              {onLoginClick ? (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="cursor-pointer underline underline-offset-4 transition-all hover:text-blue-800">
                  {t('login')}
                </button>
              ) : (
                <Link
                  href={ROUTE_LOGIN}
                  className="cursor-pointer underline underline-offset-4 transition-all hover:text-blue-800">
                  {t('login')}
                </Link>
              )}
            </div>
          </form>
          {withImage ? (
            <div className="bg-muted relative hidden rounded-2xl md:block">
              <Image
                src="/images/4.png"
                alt={tCommon('authImageAlt')}
                fill
                className="rounded-2xl object-cover"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        {t('termsFooter')} <Link href={ROUTE_TERMS}>{tCommon('termsOfService')}</Link>{' '}
        {tCommon('termsAnd')} <Link href={ROUTE_PRIVACY}>{tCommon('privacyPolicy')}</Link>.
      </div>
    </div>
  );
}
