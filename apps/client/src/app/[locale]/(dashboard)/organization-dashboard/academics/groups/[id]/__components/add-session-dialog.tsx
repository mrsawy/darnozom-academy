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
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';

export function AddSessionDialog({
  pending,
  onConfirm,
}: {
  pending: boolean;
  onConfirm: (startsAt: string, endsAt: string) => void;
}) {
  const t = useTranslations('Academics');
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startsAt || !endsAt) return;
    onConfirm(new Date(startsAt).toISOString(), new Date(endsAt).toISOString());
    setOpen(false);
    setStartsAt('');
    setEndsAt('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t('sessions.addSession')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sessions.addSessionTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="add-starts-at">{t('sessions.startTime')}</Label>
            <Input
              id="add-starts-at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="add-ends-at">{t('sessions.endTime')}</Label>
            <Input
              id="add-ends-at"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={!startsAt || !endsAt || pending}>
            {t('sessions.save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
