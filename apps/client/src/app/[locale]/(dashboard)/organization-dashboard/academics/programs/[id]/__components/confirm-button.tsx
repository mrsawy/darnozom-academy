'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
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
import { Button, buttonVariants } from '@/components/atoms/button';

export function ConfirmButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('Academics');

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button {...props}>{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t('confirmDelete')}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            onClick={onConfirm}>
            {confirmLabel ?? t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
