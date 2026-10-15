'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import {
  useDisputeSessionMutation,
  useResolveDisputeMutation,
} from '@/lib/hooks/payroll/use-payroll.hook';
import type { ISession } from '@/lib/types/academics/academics';

export interface SessionDisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ISession | null;
  canManageDispute?: boolean;
}

export function SessionDisputeModal({
  open,
  onOpenChange,
  session,
  canManageDispute = true,
}: SessionDisputeModalProps) {
  const t = useTranslations('Payroll');
  const locale = useLocale();

  const disputeMutation = useDisputeSessionMutation();
  const resolveMutation = useResolveDisputeMutation();

  const [reason, setReason] = useState('');

  if (!session) return null;

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    await disputeMutation.mutateAsync({
      sessionId: session._id,
      reason: reason.trim(),
    });

    setReason('');
    onOpenChange(false);
  };

  const handleResolve = async () => {
    await resolveMutation.mutateAsync(session._id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{t('disputeTitle')}</DialogTitle>
            {session.disputed && (
              <Badge variant="destructive">{t('disputedBadge')}</Badge>
            )}
          </div>
        </DialogHeader>

        {session.disputed ? (
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider">
                {t('disputeReason')}
              </p>
              <p className="text-sm font-medium">{session.disputeReason}</p>
              {session.disputedAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(session.disputedAt).toLocaleString(locale)}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              {canManageDispute && (
                <Button
                  type="button"
                  onClick={handleResolve}
                  disabled={resolveMutation.isPending}
                >
                  {t('resolveDispute')}
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleDispute} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disputeReason">{t('disputeReason')}</Label>
              <Textarea
                id="disputeReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('disputeReasonPlaceholder')}
                rows={4}
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t('disputeBlockedNotice')}
            </p>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={disputeMutation.isPending || !reason.trim()}
              >
                {t('dispute')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
