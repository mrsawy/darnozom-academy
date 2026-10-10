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

interface DeleteButtonProps {
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteButton({ onConfirm, isPending }: DeleteButtonProps) {
  const t = useTranslations('AdminDashboard');
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive" disabled={isPending}>
          {t('table.delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmDelete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirmDelete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('confirmDelete.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('confirmDelete.confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
