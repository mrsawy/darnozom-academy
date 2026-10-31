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
import type { ISession } from '@/lib/types/academics/academics';

function toLocalDateTimeString(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function RescheduleSessionDialog({
  session,
  pending,
  onConfirm,
}: {
  session: ISession;
  pending: boolean;
  onConfirm: (startsAt: string, endsAt: string) => void;
}) {
  const t = useTranslations('Academics');
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState(() => toLocalDateTimeString(session.startsAt));
  const [endsAt, setEndsAt] = useState(() => toLocalDateTimeString(session.endsAt));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startsAt || !endsAt) return;
    onConfirm(new Date(startsAt).toISOString(), new Date(endsAt).toISOString());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('sessions.reschedule')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sessions.rescheduleTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="reschedule-starts-at">{t('sessions.startTime')}</Label>
            <Input
              id="reschedule-starts-at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reschedule-ends-at">{t('sessions.endTime')}</Label>
            <Input
              id="reschedule-ends-at"
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
