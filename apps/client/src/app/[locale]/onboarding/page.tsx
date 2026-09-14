'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Roles } from '@islamic-academy/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api/axios';
import { ROUTE_ORGANIZATION_DASHBOARD } from '@/lib/data/constants/routes.constants';

const ROLE_OPTIONS = [Roles.SUPER_ADMIN, Roles.TEACHER, Roles.STUDENT, Roles.PARENT];

/**
 * Minimal post-Google-OAuth onboarding: role selection, phone, and (for the
 * organization-owner path) organization name/slug.
 *
 * `POST /auth/onboarding/complete` accepts `{ roleName, phone, organizationDto? }`
 * (CompleteOnboardingDto). `organizationDto` is required only when
 * `roleName === Roles.SUPER_ADMIN` — that's the role the server's
 * auth.service.completeOnboarding checks to decide whether to create an
 * organization, NOT `ORGANIZATION_ADMIN` (which this form used previously).
 */
export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [roleName, setRoleName] = useState<Roles>(Roles.SUPER_ADMIN);
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOrgAdmin = roleName === Roles.SUPER_ADMIN;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/onboarding/complete', {
        roleName,
        phone,
        ...(isOrgAdmin
          ? {
              organizationDto: { name: organizationName, slug: organizationSlug },
              acceptedTerms: true,
            }
          : {}),
      });
      router.push(ROUTE_ORGANIZATION_DASHBOARD);
    } catch {
      setError(t('validation.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-2 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-lg font-bold sm:text-2xl">{t('title')}</h1>
                <p className="text-sm text-muted-foreground text-balance">{t('subtitle')}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="role">{t('roleLabel')}</Label>
                <select
                  id="role"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value as Roles)}>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {t(`roles.${role}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">{t('phoneLabel')}</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {isOrgAdmin ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="organizationName">{t('organizationNameLabel')}</Label>
                    <Input
                      id="organizationName"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="organizationSlug">{t('organizationSlugLabel')}</Label>
                    <Input
                      id="organizationSlug"
                      dir="ltr"
                      value={organizationSlug}
                      onChange={(e) => setOrganizationSlug(e.target.value)}
                    />
                  </div>
                </>
              ) : null}

              {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('submitting') : t('submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
