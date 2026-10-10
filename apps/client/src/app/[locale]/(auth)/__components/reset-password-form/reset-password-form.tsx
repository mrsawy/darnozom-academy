'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Card, CardContent } from '@/components/atoms/card';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';
import { buildResetPasswordSchema, ResetPasswordSchema } from './reset-password-form.schema';
import { resetPassword } from '@/lib/actions/auth/auth.action';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { Link, useRouter } from '@/i18n/navigation';
import { ROUTE_LOGIN, ROUTE_FORGOT_PASSWORD } from '@/lib/data/constants/routes.constants';
import { AuthPasswordInput } from '../components/auth-password-input';
import { KeyRound, AlertCircle } from 'lucide-react';

interface ResetPasswordFormProps {
  token: string;
  email: string;
  className?: string;
}

export function ResetPasswordForm({ token, email, className }: ResetPasswordFormProps) {
  const t = useTranslations('auth.resetPassword');
  const tVal = useTranslations('auth.resetPassword.validation');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const schema = useMemo(() => buildResetPasswordSchema(tVal), [tVal]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
  });

  const onSubmit = async (data: ResetPasswordSchema) => {
    setIsLoading(true);
    try {
      const result = await resetPassword(token, email, data.newPassword);
      if ('err' in result) {
        toast.error(translateApiMessage(result.err.message, tErrors));
        return;
      }
      toast.success(t('successMessage'));
      router.push(ROUTE_LOGIN);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tErrors('somethingWentWrong');
      toast.error(translateApiMessage(message, tErrors));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="overflow-hidden p-0">
        <CardContent className="">
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className={cn('my-2 flex flex-col gap-8 md:p-16', className)}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                <KeyRound className="text-primary h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground text-sm text-balance">{t('subtitle')}</p>
            </div>

            <AuthPasswordInput
              label={t('newPasswordLabel')}
              placeholder={t('newPasswordPlaceholder')}
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />

            <AuthPasswordInput
              label={t('confirmPasswordLabel')}
              placeholder={t('confirmPasswordPlaceholder')}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {t('submit')}
            </Button>

            <div className="text-center">
              <Link
                href={ROUTE_LOGIN}
                className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors">
                {t('backToLogin')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function InvalidResetLink({ className }: { className?: string }) {
  const t = useTranslations('auth.resetPassword');

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground text-sm">{t('invalidLink')}</p>
            </div>
            <Link
              href={ROUTE_FORGOT_PASSWORD}
              className="hover:text-foreground text-sm underline underline-offset-4 transition-colors">
              {t('requestNewLink')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
