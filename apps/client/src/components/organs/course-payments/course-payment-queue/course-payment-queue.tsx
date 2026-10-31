'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import type { CoursePaymentStatus, ICoursePayment } from '@/lib/types/enrollment/course-payment';

export interface CoursePaymentQueueProps {
  payments: ICoursePayment[];
  isLoading?: boolean;
  status: CoursePaymentStatus | '';
  onStatusChange: (status: CoursePaymentStatus | '') => void;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
}

function CoursePaymentRow({
  payment,
  onApprove,
  onReject,
}: {
  payment: ICoursePayment;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
}) {
  const t = useTranslations('CoursePayments');
  const locale = useLocale();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reviewable = payment.status === 'PENDING_REVIEW';
  const studentName = [payment.user?.firstName, payment.user?.lastName].filter(Boolean).join(' ');

  const handleReject = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t('reasonRequired'));
      return;
    }
    setError(null);
    onReject(payment._id, trimmed);
  };

  return (
    <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="font-medium">{payment.course?.name}</p>
        <p className="text-muted-foreground text-sm">
          {studentName || payment.user?.email}
          {payment.user?.phone ? ` · ${payment.user.phone}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold">
            {new Intl.NumberFormat(locale, { style: 'currency', currency: payment.currency }).format(payment.amount)}
          </span>
          <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
            {payment.methodSnapshot?.label}
          </span>
          <span className="bg-muted rounded px-2 py-0.5 text-xs">{t(`status.${payment.status}`)}</span>
        </div>
        <p className="text-muted-foreground text-xs">{new Date(payment.createdAt).toLocaleString(locale)}</p>
        {payment.receiptUrl ? (
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center text-xs font-medium underline underline-offset-2 hover:opacity-80">
            {t('receipt')}
          </a>
        ) : null}
        {payment.status === 'REJECTED' && payment.rejectReason ? (
          <p className="text-destructive text-xs">{t('rejectedReason', { reason: payment.rejectReason })}</p>
        ) : null}
      </div>

      {reviewable ? (
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex items-center gap-2">
            <input
              type="text"
              aria-label={t('rejectReasonPlaceholder')}
              placeholder={t('rejectReasonPlaceholder')}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              className="bg-background rounded-md border px-3 py-1.5 text-sm"
            />
            <Button type="button" variant="outline" className="border-destructive text-destructive" onClick={handleReject}>
              {t('reject')}
            </Button>
            <Button type="button" onClick={() => onApprove(payment._id)}>
              {t('approve')}
            </Button>
          </div>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function CoursePaymentQueue({
  payments,
  isLoading = false,
  status,
  onStatusChange,
  onApprove,
  onReject,
}: CoursePaymentQueueProps) {
  const t = useTranslations('CoursePayments');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="course-payment-status-filter" className="text-sm font-medium">
          {t('filterByStatus')}
        </label>
        <select
          id="course-payment-status-filter"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as CoursePaymentStatus | '')}
          className="bg-background rounded-md border px-3 py-1.5 text-sm">
          <option value="">{t('statusAll')}</option>
          <option value="PENDING_REVIEW">{t('status.PENDING_REVIEW')}</option>
          <option value="APPROVED">{t('status.APPROVED')}</option>
          <option value="REJECTED">{t('status.REJECTED')}</option>
        </select>
      </div>

      {isLoading || payments.length === 0 ? (
        <div className="bg-card text-muted-foreground flex h-32 items-center justify-center rounded-lg border p-6">
          {isLoading ? t('loading') : t('empty')}
        </div>
      ) : (
        payments.map((payment) => (
          <CoursePaymentRow key={payment._id} payment={payment} onApprove={onApprove} onReject={onReject} />
        ))
      )}
    </div>
  );
}
