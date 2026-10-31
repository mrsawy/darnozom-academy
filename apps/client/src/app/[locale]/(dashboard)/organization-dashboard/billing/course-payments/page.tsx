'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useApproveCoursePayment,
  useOrgCoursePayments,
  useRejectCoursePayment,
} from '@/lib/hooks/enrollment/use-course-payment.hook';
import { CoursePaymentQueue } from '@/components/organs/course-payments/course-payment-queue/course-payment-queue';
import type { CoursePaymentStatus } from '@/lib/types/enrollment/course-payment';

export default function CoursePaymentsPage() {
  const t = useTranslations('CoursePayments');
  const [status, setStatus] = useState<CoursePaymentStatus | ''>('PENDING_REVIEW');
  const { data: payments, isLoading } = useOrgCoursePayments(status ? { status } : undefined);
  const approve = useApproveCoursePayment();
  const reject = useRejectCoursePayment();

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('pageSubtitle')}</p>
      </div>

      <CoursePaymentQueue
        payments={payments ?? []}
        isLoading={isLoading}
        status={status}
        onStatusChange={setStatus}
        onApprove={(id) => approve.mutate(id)}
        onReject={(id, reason) => reject.mutate({ paymentId: id, reason })}
      />
    </div>
  );
}
