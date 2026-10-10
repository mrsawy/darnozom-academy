'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconCircleCheckFilled, IconX } from '@tabler/icons-react';
import { ApprovalStatus } from '@lms-organization/shared-types';
import { useVerificationStatus } from '@/lib/hooks/verification/useVerificationStatus';

/** How long after approval the congrats banner keeps showing (auto-expires even if never dismissed). */
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One-time congratulations banner shown at the top of the org dashboard right
 * after the account is approved. Visible only while the approval is recent, and
 * dismissible (dismissal is remembered per approval via localStorage).
 */
export function VerificationSuccessAlert() {
  const t = useTranslations('OrgAccountStatus');
  const { data } = useVerificationStatus();

  const reviewedAt = data?.approvalReviewedAt ? new Date(data.approvalReviewedAt).getTime() : null;
  const isRecentlyApproved =
    data?.approvalStatus === ApprovalStatus.APPROVED &&
    reviewedAt !== null &&
    Date.now() - reviewedAt < RECENT_WINDOW_MS;

  const storageKey = reviewedAt ? `org-verification-congrats-dismissed-${reviewedAt}` : null;

  // `null` = not yet resolved on the client; avoids flashing an already-dismissed alert.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    setDismissed(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  if (!isRecentlyApproved || dismissed !== false) return null;

  const handleDismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-success/30 bg-success/10 mx-4 mt-4 flex items-start gap-3 rounded-xl border p-4">
      <IconCircleCheckFilled className="text-success mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground font-semibold">{t('verifiedCongratsTitle')}</p>
        <p className="text-muted-foreground text-sm">{t('verifiedCongratsDescription')}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('dismiss')}
        className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors">
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}
