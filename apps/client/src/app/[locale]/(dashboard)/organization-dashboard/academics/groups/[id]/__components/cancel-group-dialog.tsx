'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { Textarea } from '@/components/atoms/textarea';

export function CancelGroupDialog({
  pending,
  onConfirm,
}: {
  pending: boolean;
  onConfirm: (reason: string) => void;
}) {
  const t = useTranslations('Academics');
  const [reason, setReason] = useState('');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">{t('cancelGroup.title')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelGroup.title')}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('cancelGroup.reason')}
          rows={3}
        />
        <Button
          variant="destructive"
          disabled={!reason.trim() || pending}
          onClick={() => onConfirm(reason)}>
          {t('cancelGroup.confirm')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
