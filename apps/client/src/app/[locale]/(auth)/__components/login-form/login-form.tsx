'use client';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/atoms/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';
import { useForm } from 'react-hook-form';
import { buildLoginSchema, type LoginSchema } from './login-form.schema';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { handleLogin } from '@/lib/actions/auth/auth.action';
import useGeneralStore from '@/lib/store/generalStore';
import { Link, useRouter } from '@/i18n/navigation';
import { routesAfterLogin } from '../routesAfterLogin.config';
import useUserStore from '@/lib/store/userStore';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/atoms/input';
import { PasswordInput } from '@/components/atoms/password-input';
import { Label } from '@/components/atoms/label';
import {
  ROUTE_SIGNUP,
  ROUTE_FORGOT_PASSWORD,
  ROUTE_TERMS,
  ROUTE_PRIVACY,
} from '@/lib/data/constants/routes.constants';
import { GoogleAuthButton } from '../components';

interface LoginError {
  message?: string;
}

export function LoginForm({
  className,
  redirectUrl,
  onSignupClick,
  onSuccess,
  withImage = true,
  ...props
}: React.ComponentProps<'form'> & {
  redirectUrl?: string;
  onSignupClick?: () => void;
  onSuccess?: () => void;
  withImage?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const tVal = useTranslations('auth.login.validation');
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('auth.common');
  const schema = useMemo(() => buildLoginSchema(tVal), [tVal]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
  });

  const onSubmit = async (data: LoginSchema) => {
    try {
      useGeneralStore.setState({ generalIsLoading: true });
      const response = await handleLogin(data);
      if ('err' in response) {
        return toast.error(tErrors(`${response.err.message}`));
      }
      useUserStore.getState().setUser(response);
      onSuccess?.();
      // Dialog hosts handle post-auth (e.g. resume enrollment) — stay on the page.
      if (onSuccess) return;
      router.push(redirectUrl ?? routesAfterLogin(response.roleName));
    } catch (err: unknown) {
      const error = err as LoginError;
      const message = tErrors(`${error.message}`) ?? tErrors('somethingWentWrong');
      setError('root', { message });
      setTimeout(() => {
        setError('root', { message: '' });
      }, 2000);
      toast.error(message);
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', withImage ? '' : 'container max-w-6xl', className)}>
      <Card className="overflow-hidden p-0">
        <CardContent
          className={cn('grid gap-6 p-5', withImage ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className={cn('my-2 flex flex-col gap-8 md:p-4', className)}
            {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-lg font-bold sm:text-2xl">{t('title')}</h1>
              <p className="text-muted-foreground text-sm text-balance">{t('subtitle')}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="lg:text-medium text-sm" htmlFor="identifier">
                {t('identifierLabel')}
              </Label>
              <Input
                placeholder={t('identifierPlaceholder')}
                className="lg:placeholder:text-medium lg:text-medium text-sm placeholder:text-sm"
                dir="ltr"
                {...register('identifier')}
              />
              {errors.identifier ? (
                <p className="text-left text-sm text-red-400">{errors.identifier?.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="lg:text-medium text-sm" htmlFor="password">
                  {t('passwordLabel')}
                </Label>
                <Link
                  href={ROUTE_FORGOT_PASSWORD}
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4 transition-colors">
                  {t('forgotPassword')}
                </Link>
              </div>
              <PasswordInput
                className="lg:placeholder:text-medium lg:text-medium text-sm placeholder:text-sm"
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-left text-sm text-red-400">{errors.password?.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full">
              {t('submit')}
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card text-muted-foreground px-2">{t('orContinueWith')}</span>
              </div>
            </div>

            <GoogleAuthButton />

            <p
              className={cn(
                'bg-destructive/90 m-auto w-5/12 scale-0 rounded-2xl p-2 text-center text-xs text-red-50 transition-all duration-300 md:text-sm md:font-extrabold',
                errors?.root && errors.root?.message && 'scale-100'
              )}>
              {errors?.root?.message ?? ''}
            </p>

            <div className="text-center text-sm">
              {t('noAccount')}{' '}
              {onSignupClick ? (
                <button
                  type="button"
                  onClick={onSignupClick}
                  className="cursor-pointer underline underline-offset-4 transition-all hover:text-blue-800">
                  {t('signUp')}
                </button>
              ) : (
                <Link
                  href={ROUTE_SIGNUP}
                  className="cursor-pointer underline underline-offset-4 transition-all hover:text-blue-800">
                  {t('signUp')}
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
