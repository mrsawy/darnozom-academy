import { Button } from '@/components/atoms/button';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import React from 'react';
import { Loader2 } from 'lucide-react';
import WishlistHeartButton from '../molecules/wishlist-heart-button';
import { useTranslations } from 'next-intl';
import type { TranslationValues } from 'next-intl';

type EnrollmentT = (key: string, values?: TranslationValues) => string;

interface EnrollmentButtonsProps {
  isPaid: boolean;
  selectedPricing: BillingCycle;
  onEnroll: () => void;
  courseId: string;
  isEnrolled?: boolean;
  isEnrollmentExpired?: boolean;
  isProcessing?: boolean;
  /** Manual-transfer payment submitted and awaiting organization review. */
  isPendingPayment?: boolean;
  isPaymentRejected?: boolean;
  /** The organization enabled InstaPay / Vodafone Cash / custom transfer methods. */
  canPayByTransfer?: boolean;
  onPayByTransfer?: () => void;
}

const getButtonText = (
  isPaid: boolean,
  selectedPricing: BillingCycle,
  isEnrolled: boolean,
  isEnrollmentExpired: boolean,
  t: EnrollmentT,
  isPendingPayment = false,
  isPaymentRejected = false
): string => {
  if (isPendingPayment) return isPaymentRejected ? t('resubmitReceipt') : t('paymentUnderReview');
  if (isEnrolled && isEnrollmentExpired) return t('renewSubscription');
  if (isEnrolled) return t('goToCourse');
  if (!isPaid) return t('enrollForFree');

  switch (selectedPricing) {
    case BillingCycle.MONTHLY: {
      return t('startMonthlySubscription');
    }
    case BillingCycle.YEARLY: {
      return t('startYearlySubscription');
    }
    case BillingCycle.ONE_TIME: {
      return t('enrollNow');
    }
    default: {
      return t('enrollNow');
    }
  }
};

const EnrollmentButtons = React.memo<EnrollmentButtonsProps>(
  ({
    isPaid,
    selectedPricing,
    onEnroll,
    courseId,
    isEnrolled = false,
    isEnrollmentExpired = false,
    isProcessing = false,
    isPendingPayment = false,
    isPaymentRejected = false,
    canPayByTransfer = false,
    onPayByTransfer,
  }: EnrollmentButtonsProps) => {
    const t = useTranslations('Courses.singleCourse.enrollment');
    const underReview = isPendingPayment && !isPaymentRejected;

    return (
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={onEnroll}
          disabled={isProcessing || underReview}
          aria-busy={isProcessing}
          variant={isEnrollmentExpired || isPaymentRejected ? 'destructive' : 'default'}>
          {isProcessing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {getButtonText(
            isPaid,
            selectedPricing,
            isEnrolled,
            isEnrollmentExpired,
            t,
            isPendingPayment,
            isPaymentRejected
          )}
        </Button>
        {isPaid && canPayByTransfer && !isEnrolled && !isPendingPayment && onPayByTransfer ? (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={onPayByTransfer}
            disabled={isProcessing}>
            {t('payByTransfer')}
          </Button>
        ) : null}
        <WishlistHeartButton
          courseId={courseId}
          size="lg"
          variant="outline"
          showText
          className="w-full"
        />
      </div>
    );
  }
);

EnrollmentButtons.displayName = 'EnrollmentButtons';
export default EnrollmentButtons;
