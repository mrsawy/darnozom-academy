'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/atoms/alert-dialog';

interface SuspendButtonProps {
  isSuspended: boolean;
  onSuspend: () => void;
  onUnsuspend: () => void;
  isPending: boolean;
}

export function SuspendButton({
  isSuspended,
  onSuspend,
  onUnsuspend,
  isPending,
}: SuspendButtonProps) {
  const t = useTranslations('AdminDashboard');

  if (isSuspended) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={isPending}>
            {t('buttons.reactivate')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmReactivate.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmReactivate.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirmDelete.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onUnsuspend}>
              {t('confirmReactivate.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isPending}>
          {t('buttons.suspend')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmSuspend.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirmSuspend.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('confirmDelete.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onSuspend}>{t('confirmSuspend.confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
