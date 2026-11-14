'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { Link } from '@/i18n/navigation';
import { getFileUrl } from '@/lib/actions/file/getPreSignedUrl';
import { formatMoney } from '@/lib/utils/billing/format-money';
import type { IFamilyPayment } from '@/lib/types/billing/billing';

function ReceiptLink({ fileKey }: { fileKey: string }) {
  const t = useTranslations('Billing');
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = (await getFileUrl({ fileKey })) as string | undefined;
      if (!cancelled && typeof result === 'string') setUrl(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [fileKey]);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary text-xs font-medium underline underline-offset-2">
      {t('receipt')}
    </a>
  );
}

export function PaymentDetailsDialog({
  payments,
  open,
  onOpenChange,
}: {
  payments: IFamilyPayment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Billing');
  const locale = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('paymentDetails')}</DialogTitle>
        </DialogHeader>
        {payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noPendingDetails')}</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment._id} className="space-y-1 rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-bold">
                    {formatMoney(payment.amountMinor, payment.currency, locale)}
                  </span>
                  <span className="bg-muted rounded px-2 py-0.5 text-xs">
                    {payment.methodSnapshot?.label ?? payment.method}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {new Date(payment.createdAt).toLocaleString(locale)}
                </p>
                {payment.methodSnapshot?.fields
                  ?.filter((field) => field.type === 'TEXT' || field.type === 'LINK')
                  .map((field) => (
                    <p key={field.key} className="text-xs">
                      <span className="text-muted-foreground">{field.label}: </span>
                      {field.value}
                    </p>
                  ))}
                {payment.note ? <p className="text-xs">{payment.note}</p> : null}
                {payment.receiptFileKey ? <ReceiptLink fileKey={payment.receiptFileKey} /> : null}
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button asChild variant="outline">
            <Link href="/organization-dashboard/billing/receipts">{t('openPaymentsPage')}</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
