'use client';

import { IEnrollment, SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { Button } from '@/components/atoms/button';
import { IconDotsVertical } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface EnrollmentRowActionsProps {
  enrollment: IEnrollment;
  onViewProgress: (enrollment: IEnrollment) => void;
  onViewSubscription: (enrollment: IEnrollment) => void;
  onToggleAccess: (enrollment: IEnrollment) => void;
}

export function EnrollmentRowActions({
  enrollment,
  onViewProgress,
  onViewSubscription,
  onToggleAccess,
}: EnrollmentRowActionsProps) {
  const t = useTranslations('EnrollmentDataTable');
  const isActive = enrollment.subscription?.status === SubscriptionStatus.ACTIVE;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="data-[state=open]:bg-muted flex size-8" size="icon">
          <IconDotsVertical />
          <span className="sr-only">{t('openMenu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onViewProgress(enrollment)}>
          {t('viewProgress')}
        </DropdownMenuItem>
        {enrollment.subscription ? (
          <DropdownMenuItem onClick={() => onViewSubscription(enrollment)}>
            {t('viewSubscription')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onToggleAccess(enrollment)}>
          {isActive ? t('deactivateAccess') : t('activateAccess')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
