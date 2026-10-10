'use client';

import { InfoIcon, LockIcon, UserRoundIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PasswordHintProps {
  passwordLastUpdated?: string | null;
  /** When true, do not show "same password as yours" — password was chosen when the student created the parent account. */
  parentCreatedByStudent?: boolean;
}

export function PasswordHint({ passwordLastUpdated, parentCreatedByStudent }: PasswordHintProps) {
  const t = useTranslations('StudentDashboard.parentInfo');

  const passwordChangedByParent = Boolean(passwordLastUpdated);
  const passwordSetByStudentAtCreation = Boolean(parentCreatedByStudent) && !passwordLastUpdated;

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        passwordChangedByParent
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          : passwordSetByStudentAtCreation
            ? 'bg-muted text-foreground'
            : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      }`}>
      {passwordChangedByParent ? (
        <>
          <LockIcon className="h-4 w-4 shrink-0" />
          <span>{t('passwordChanged')}</span>
        </>
      ) : passwordSetByStudentAtCreation ? (
        <>
          <UserRoundIcon className="h-4 w-4 shrink-0" />
          <span>{t('passwordSetByYouAtCreation')}</span>
        </>
      ) : (
        <>
          <InfoIcon className="h-4 w-4 shrink-0" />
          <span>{t('samePassword')}</span>
        </>
      )}
    </div>
  );
}
