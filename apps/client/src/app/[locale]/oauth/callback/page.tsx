'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { handleOAuthCallback } from '@/lib/actions/auth/auth.action';
import useUserStore from '@/lib/store/userStore';
import { ROUTE_ONBOARDING, ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * Landing page that the NestJS server redirects to after a successful Google
 * OAuth flow: `GET /auth/google/callback` → this page with tokens in the query-string.
 *
 * URL shape (set by the server):
 *   /oauth/callback?access_token=...&refresh_token=...&sid=...&onboarding_required=true
 */
export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.oauth');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Server now issues a short-lived one-time code instead of tokens in the URL.
    const oauth_code = searchParams.get('oauth_code') ?? '';

    void (async () => {
      const result = await handleOAuthCallback({ oauth_code });

      if ('err' in result) {
        toast.error(result.err.message);
        router.replace(ROUTE_LOGIN);
        return;
      }

      useUserStore.getState().setUser(result.user);

      if (result.user.onboardingComplete === false) {
        router.replace(ROUTE_ONBOARDING);
      } else {
        router.replace(getDashboardUrl(result.user.roleName));
      }
    })();
  }, [searchParams, router, t]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <Loader2 className="text-primary h-10 w-10 animate-spin" />
      <p className="text-muted-foreground text-sm">{t('signingIn')}</p>
    </div>
  );
}
