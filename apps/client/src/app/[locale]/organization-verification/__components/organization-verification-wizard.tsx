'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { IconCheck, IconLoader2, IconLogout, IconShieldCheck } from '@tabler/icons-react';
import { ApprovalStatus, VerificationStatus } from '@darnozom/shared-types';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/atoms/card';
import { useVerificationStatus } from '@/lib/hooks/verification/useVerificationStatus';
import { logout } from '@/lib/actions/auth/auth.action';
import { ROUTE_ORGANIZATION_DASHBOARD } from '@/lib/data/constants/routes.constants';
import EmailVerificationPage from '@/app/[locale]/(dashboard)/organization-dashboard/verification/email/page';
import IdentityVerificationPage from '@/app/[locale]/(dashboard)/organization-dashboard/verification/identity/page';
import { Button } from '@/components';

type StepKey = 'email' | 'identity' | 'review';

/**
 * Standalone gate for organizations whose account is not yet approved. Walks the
 * super-admin through: verify email → submit identity → wait for admin review.
 * Once the admin approves (approvalStatus APPROVED) it redirects to the dashboard.
 * The org cannot reach the dashboard until then (enforced by the dashboard layout).
 */
export function OrganizationVerificationWizard() {
  const t = useTranslations('OrgAccountStatus');
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useVerificationStatus();

  const approved = data?.approvalStatus === ApprovalStatus.APPROVED;

  useEffect(() => {
    if (approved) router.replace(ROUTE_ORGANIZATION_DASHBOARD);
  }, [approved, router]);

  // Wait for real server state before choosing a step, so a re-login resumes at the
  // right place instead of defaulting to the email step from missing/loading data.
  if (isLoading || approved || (!data && !isError)) {
    return (
      <div className="grid min-h-[calc(100svh-4rem)] place-items-center">
        <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Status couldn't be loaded — never silently fall back to the email step.
  if (isError || !data) {
    return (
      <div className="grid min-h-[calc(100svh-4rem)] place-items-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm">{t('loadError')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  const emailVerified = data?.verification?.email?.verified === true;
  const identityStatus = data?.verification?.identity?.status ?? VerificationStatus.UNVERIFIED;
  const identitySubmitted =
    identityStatus === VerificationStatus.PENDING || identityStatus === VerificationStatus.VERIFIED;

  const currentStep: StepKey = emailVerified ? 'identity' : 'email';
  const awaitingReview = emailVerified && identityStatus === VerificationStatus.PENDING;

  return (
    <div className="from-primary/5 via-background to-background relative min-h-[calc(100svh-4rem)] w-full overflow-hidden bg-linear-to-b px-4 py-10 sm:py-14">
      {/* soft brand glow */}
      <div className="bg-primary/10 dark:bg-primary/5 pointer-events-none absolute inset-s-1/2 -top-24 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-6">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-primary/10 text-primary ring-primary/15 flex h-12 w-12 items-center justify-center rounded-2xl ring-1">
            <IconShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('wizardTitle')}</h1>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm text-balance">
              {t('wizardSubtitle')}
            </p>
          </div>
        </div>

        <Card className="w-full overflow-hidden rounded-2xl border shadow-sm">
          <div className="border-b px-6 pt-6 pb-5">
            <Stepper
              currentStep={currentStep}
              emailDone={emailVerified}
              identityDone={identitySubmitted}
              reviewActive={awaitingReview}
            />
          </div>

          <CardContent className="p-6">
            <div className="mx-auto max-w-md">
              {currentStep === 'email' ? (
                <EmailVerificationPage embedded />
              ) : (
                <IdentityVerificationPage embedded />
              )}
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => void logout()}>
          <IconLogout className="h-4 w-4" />
          {t('logout')}
        </Button>
      </div>
    </div>
  );
}

function Stepper({
  currentStep,
  emailDone,
  identityDone,
  reviewActive,
}: {
  currentStep: StepKey;
  emailDone: boolean;
  identityDone: boolean;
  reviewActive: boolean;
}) {
  const t = useTranslations('OrgAccountStatus');
  const steps: { key: StepKey; label: string; done: boolean; active: boolean }[] = [
    { key: 'email', label: t('stepEmail'), done: emailDone, active: currentStep === 'email' },
    {
      key: 'identity',
      label: t('stepIdentity'),
      done: identityDone,
      active: currentStep === 'identity' && !identityDone,
    },
    { key: 'review', label: t('stepReview'), done: false, active: reviewActive },
  ];

  return (
    <ol className="flex items-center">
      {steps.map((step, i) => (
        <li key={step.key} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                step.done
                  ? 'bg-success text-success-foreground border-transparent'
                  : step.active
                    ? 'border-primary text-primary ring-primary/15 ring-4'
                    : 'border-border text-muted-foreground'
              )}>
              {step.done ? <IconCheck className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-center text-[11px] font-medium sm:text-xs',
                step.done || step.active ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 ? (
            <span
              className={cn(
                'mx-2 mb-5 h-0.5 flex-1 rounded-full transition-colors',
                step.done ? 'bg-success' : 'bg-border'
              )}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
