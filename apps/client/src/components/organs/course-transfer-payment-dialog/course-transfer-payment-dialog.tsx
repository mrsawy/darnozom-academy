'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Landmark } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { uploadFileToS3 } from '@/lib/actions/file/uploadFile';
import { useCoursePaymentOptions, useSubmitCoursePayment } from '@/lib/hooks/enrollment/use-course-payment.hook';
import type { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import type { ICoursePaymentMethod } from '@/lib/types/enrollment/course-payment';

function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

interface CourseTransferPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  billingCycle: BillingCycle;
  /** Shown when re-submitting after the organization rejected the previous receipt. */
  rejectReason?: string | null;
}

function MethodDetails({ method }: { method: ICoursePaymentMethod }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {method.fields
        .filter((field) => field.value?.trim())
        .map((field) => {
          const href = safeHref(field.value);
          return (
            <div key={field.key} className="text-sm">
              <span className="text-muted-foreground">{field.label}: </span>
              {field.type === 'IMAGE' && href ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-provided image
                <img src={href} alt={field.label} className="mt-1 max-w-[160px] rounded-md border" />
              ) : field.type === 'LINK' && href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {field.value}
                </a>
              ) : (
                <span className="font-medium">{field.value}</span>
              )}
            </div>
          );
        })}
    </div>
  );
}

export function CourseTransferPaymentDialog({
  open,
  onClose,
  courseId,
  courseName,
  billingCycle,
  rejectReason,
}: CourseTransferPaymentDialogProps) {
  const t = useTranslations('CoursePayments');
  const locale = useLocale();
  const { data: options, isLoading } = useCoursePaymentOptions(courseId, open);
  const submit = useSubmitCoursePayment(courseId);
  const [methodId, setMethodId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const methods = options?.methods ?? [];
  const selected = methods.find((m) => m._id === (methodId || methods[0]?._id));
  const price = options?.prices[billingCycle];

  const handleSubmit = async () => {
    if (!file || !selected) return;
    setIsUploading(true);
    try {
      const receiptFileKey = await uploadFileToS3({ file });
      await submit.mutateAsync({
        courseId,
        paymentMethodConfigId: selected._id,
        billingCycle,
        receiptFileKey,
      });
      setFile(null);
      onClose();
    } catch {
      // errors surface through the mutation's toast
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description', { course: courseName })}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : methods.length === 0 || !price ? (
          <p className="text-muted-foreground text-sm">{t('noMethods')}</p>
        ) : (
          <div className="space-y-4">
            {rejectReason ? (
              <p className="text-destructive rounded-md border border-destructive/30 p-3 text-sm">
                {t('rejectedReason', { reason: rejectReason })}
              </p>
            ) : null}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground text-sm">{t('amountToTransfer')}</span>
              <span className="font-bold">
                {new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency }).format(price.amount)}
              </span>
            </div>

            <div className="space-y-2" role="radiogroup" aria-label={t('chooseMethod')}>
              <p className="text-sm font-medium">{t('chooseMethod')}</p>
              <div className="flex flex-wrap gap-2">
                {methods.map((method) => (
                  <Button
                    key={method._id}
                    type="button"
                    role="radio"
                    aria-checked={selected?._id === method._id}
                    variant={selected?._id === method._id ? 'default' : 'outline'}
                    onClick={() => setMethodId(method._id)}>
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {selected ? <MethodDetails method={selected} /> : null}

            <div className="space-y-1">
              <label htmlFor="course-transfer-receipt" className="text-sm font-medium">
                {t('uploadReceipt')}
              </label>
              <input
                id="course-transfer-receipt"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="bg-background file:bg-primary file:text-primary-foreground w-full rounded-md border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium"
              />
              <p className="text-muted-foreground text-xs">{t('reviewNote')}</p>
            </div>

            <Button className="w-full" disabled={!file || isUploading || submit.isPending} onClick={handleSubmit}>
              {t('submit')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
