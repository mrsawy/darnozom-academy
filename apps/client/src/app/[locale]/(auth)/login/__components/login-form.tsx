'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api/axios';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { ROUTE_SIGNUP, ROUTE_FORGOT_PASSWORD } from '@/lib/data/constants/routes.constants';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';
import { IUser } from '@/types/user/user.interface';

/** Server's Google OAuth initiation route — see GoogleAuthGuard/@Get('google') on AuthControllerHttp. */
const GOOGLE_SIGN_IN_URL = `${getPublicApiUrl()}/auth/google`;

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export function LoginForm() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      setError(t('validation.required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post<IUser>('/auth/login', parsed.data);
      router.push(getDashboardUrl(data.roleName));
    } catch {
      setError(t('validation.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-lg font-bold sm:text-2xl">{t('title')}</h1>
            <p className="text-sm text-muted-foreground text-balance">{t('subtitle')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">{t('identifierLabel')}</Label>
            <Input
              id="identifier"
              dir="ltr"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t('identifierPlaceholder')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('passwordLabel')}</Label>
              <Link
                href={ROUTE_FORGOT_PASSWORD}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                {t('forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>

          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-card px-2">{t('orContinueWith')}</span>
          </div>

          <a
            href={GOOGLE_SIGN_IN_URL}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-transparent text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground">
            {t('continueWithGoogle')}
          </a>

          <div className="text-center text-sm">
            {t('noAccount')}{' '}
            <Link href={ROUTE_SIGNUP} className="underline underline-offset-4 hover:text-primary">
              {t('signUp')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
