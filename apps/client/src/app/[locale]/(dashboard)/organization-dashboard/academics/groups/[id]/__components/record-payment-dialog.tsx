'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { useRecordOfflinePayment, useStatement } from '@/lib/hooks/billing/use-billing.hook';
import { formatMoney, parseMoney } from '@/lib/utils/billing/format-money';
import type { IBillingSubscription } from '@/lib/types/billing/billing';

export function RecordPaymentDialog({
  subscription,
  open,
  onOpenChange,
}: {
  subscription: IBillingSubscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const record = useRecordOfflinePayment();
  const { data: statement } = useStatement(subscription.familyId, open);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [invalid, setInvalid] = useState(false);

  const outstandingMinor =
    statement?.openSubscriptions.find((s) => s.subscriptionId === subscription._id)
      ?.outstandingMinor ?? 0;

  const submit = () => {
    const amountMinor = parseMoney(amount);
    if (!amountMinor) {
      setInvalid(true);
      return;
    }
    record.mutate(
      { subscriptionId: subscription._id, amountMinor, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setAmount('');
          setNote('');
          setInvalid(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('recordPaymentTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{t('recordPaymentHint')}</p>
        <p className="text-sm">
          {t('recordPaymentOutstanding')}:{' '}
          <span className="font-mono font-medium">
            {formatMoney(outstandingMinor, subscription.currency, locale)}
          </span>
        </p>
        <div className="space-y-2">
          <Label htmlFor="offline-amount">{t('recordPaymentAmount')}</Label>
          <Input
            id="offline-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setInvalid(false);
            }}
          />
          {outstandingMinor > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAmount(String(outstandingMinor / 100))}>
              {t('recordPaymentFull')}
            </Button>
          ) : null}
          {invalid ? (
            <p className="text-destructive text-xs">{t('recordPaymentInvalid')}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="offline-note">{t('recordPaymentNote')}</Label>
          <Input id="offline-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button disabled={record.isPending} onClick={submit}>
            {t('recordPaymentConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
