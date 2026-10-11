'use client';

import { useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Currency } from '@darnozom/shared-types';
import { useRouter } from '@/i18n/navigation';
import { useMutation, useQueryClient } from '@/lib/utils';
import { renewEnrollment } from '@/lib/actions/enrollment/renewEnrollment.action';
import { PaymentMethod, PaymentProvider } from '@/lib/types/payment/payment.interface';
import { PaymentResponse } from '@/lib/types/payment/directPaymentResponse.interface';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { enrollmentKeys } from '@/lib/hooks/enrollment/enrollments.hook';
import { ROUTE_STUDENT_COURSES } from '@/lib/data/constants/routes.constants';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';

export interface UseRenewEnrollmentOptions {
  /** Called after a successful renew (wallet or payment link opened). */
  onCompleted?: () => void;
}

export function useRenewEnrollment(
  enrollmentId: string | undefined,
  options?: UseRenewEnrollmentOptions
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tRenewal = useTranslations('StudentCourses.renewalModal');
  const tErrors = useTranslations('errors');
  const onCompletedRef = useRef(options?.onCompleted);
  onCompletedRef.current = options?.onCompleted;

  const mutation = useMutation({
    mutationFn: ({
      billingCycle,
      paymentMethod,
    }: {
      billingCycle: BillingCycle;
      paymentMethod: PaymentMethod;
    }) => {
      if (!enrollmentId) throw new Error('Missing enrollment');
      return renewEnrollment({
        enrollmentId,
        billingCycle,
        paymentMethod,
        provider: PaymentProvider.PAYMOB,
        currency: Currency.DEFAULT,
      });
    },
    onSuccess: (response, { paymentMethod }) => {
      if (paymentMethod === PaymentMethod.WALLET) {
        toast.success(tRenewal('renewed'));
        onCompletedRef.current?.();
        void queryClient.invalidateQueries({ queryKey: enrollmentKeys.student() });
        router.push(ROUTE_STUDENT_COURSES);
      } else {
        const paymentResponse = response as PaymentResponse;
        if (paymentResponse.paymentUrl) {
          globalThis.open(paymentResponse.paymentUrl, '_blank');
        }
        onCompletedRef.current?.();
      }
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : '';
      toast.error(msg ? translateApiMessage(msg, tErrors) : tRenewal('renewFailed'));
    },
  });

  const handleRenew = useCallback(
    (billingCycle: BillingCycle, paymentMethod: 'WALLET' | 'DIRECT') => {
      if (!enrollmentId) return;
      mutation.mutate({
        billingCycle,
        paymentMethod: paymentMethod === 'WALLET' ? PaymentMethod.WALLET : PaymentMethod.DIRECT,
      });
    },
    [enrollmentId, mutation]
  );

  return {
    handleRenew,
    isRenewing: mutation.isPending,
  };
}
