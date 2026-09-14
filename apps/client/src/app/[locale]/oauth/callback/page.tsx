'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api/axios';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { ROUTE_ONBOARDING, ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { IUser } from '@/types/user/user.interface';

/**
 * Landing page the NestJS server redirects to after a successful Google
 * OAuth flow: `GET /auth/google/callback` -> this page with a one-time code
 * in the query string.
 *
 * URL shape (ASSUMPTION, matching the reference pattern):
 *   /oauth/callback?oauth_code=...
 *
 * The code is exchanged server-side via `POST /api/auth/oauth/exchange`
 * (this app's own Route Handler), which sets httpOnly cookies.
 */
export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.oauth');
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const oauthCode = searchParams.get('oauth_code') ?? '';

    void (async () => {
      if (!oauthCode) {
        setError(t('missingCode'));
        router.replace(ROUTE_LOGIN);
        return;
      }

      try {
        const { data: user } = await api.post<IUser>('/auth/oauth/exchange', {
          oauth_code: oauthCode,
        });

        if (user.onboardingComplete === false) {
          router.replace(ROUTE_ONBOARDING);
        } else {
          router.replace(getDashboardUrl(user.roleName));
        }
      } catch {
        setError(t('failed'));
        router.replace(ROUTE_LOGIN);
      }
    })();
  }, [searchParams, router, t]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{error ?? t('signingIn')}</p>
    </div>
  );
}
