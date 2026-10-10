'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Card, CardContent } from '@/components/atoms/card';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';
import { buildForgotPasswordSchema, ForgotPasswordSchema } from './forgot-password-form.schema';
import { forgotPassword } from '@/lib/actions/auth/auth.action';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { Link } from '@/i18n/navigation';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { AuthTextInput } from '../components/auth-text-input';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm({ className }: { className?: string }) {
  const t = useTranslations('auth.forgotPassword');
  const tVal = useTranslations('auth.forgotPassword.validation');
  const tErrors = useTranslations('errors');

  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const schema = useMemo(() => buildForgotPasswordSchema(tVal), [tVal]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordSchema>({
    resolver: yupResolver(schema),
    mode: 'onSubmit',
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmit = async (data: ForgotPasswordSchema) => {
    setIsLoading(true);
    try {
      const result = await forgotPassword(data.email);
      if ('err' in result) {
        toast.error(translateApiMessage(result.err.message, tErrors));
        return;
      }
      setSubmittedEmail(data.email);
      setSent(true);
      startCooldown();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tErrors('somethingWentWrong');
      toast.error(translateApiMessage(message, tErrors));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsLoading(true);
    try {
      const email = submittedEmail || getValues('email');
      const result = await forgotPassword(email);
      if ('err' in result) {
        toast.error(translateApiMessage(result.err.message, tErrors));
        return;
      }
      startCooldown();
      toast.success(t('resendSuccess'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tErrors('somethingWentWrong');
      toast.error(translateApiMessage(message, tErrors));
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={cn('flex flex-col gap-6', className)}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground text-sm">{t('successMessage')}</p>
                <p className="text-muted-foreground text-xs">{t('checkSpam')}</p>
              </div>

              <div className="flex w-full flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={cooldown > 0 || isLoading}
                  onClick={() => void handleResend()}>
                  {cooldown > 0 ? t('resendCooldown', { seconds: cooldown }) : t('resend')}
                </Button>

                <Link
                  href={ROUTE_LOGIN}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 text-sm transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  {t('backToLogin')}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <Mail className="text-primary h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground text-sm text-balance">{t('subtitle')}</p>
            </div>

            <AuthTextInput
              label={t('emailLabel')}
              placeholder={t('emailPlaceholder')}
              type="email"
              dir="ltr"
              error={errors.email?.message}
              {...register('email')}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {t('submit')}
            </Button>

            <div className="text-center">
              <Link
                href={ROUTE_LOGIN}
                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 text-sm transition-colors">
                <ArrowLeft className="h-4 w-4" />
                {t('backToLogin')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
