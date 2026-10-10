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
}

const getButtonText = (
  isPaid: boolean,
  selectedPricing: BillingCycle,
  isEnrolled: boolean,
  isEnrollmentExpired: boolean,
  t: EnrollmentT
): string => {
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
  }: EnrollmentButtonsProps) => {
    const t = useTranslations('Courses.singleCourse.enrollment');

    return (
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={onEnroll}
          disabled={isProcessing}
          aria-busy={isProcessing}
          variant={isEnrollmentExpired ? 'destructive' : 'default'}>
          {isProcessing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {getButtonText(isPaid, selectedPricing, isEnrolled, isEnrollmentExpired, t)}
        </Button>
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
