import { Card, CardContent } from '@/components/atoms/card';
import { ICourse } from '@/lib/types/course/course.interface';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { IUser } from '@/lib/types/user/user.interface';
import { IWallet } from '@/lib/types/wallet/IWallet';
import React, { useCallback } from 'react';
import WalletBalanceAlert from './wallet-balance-alert';
import FreePricing from './free-pricing';
import PricingTabs from './pricing-tabs';
import EnrollmentButtons from './enrollment-buttons';
import CourseIncludes from './course-includes';
import CourseMetadata from './course-meta-data';
import { HeroVideoDialog } from '@/components/molecules/video-player/magic-player';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface CourseEnrollmentCardProps {
  user?: IUser | null;
  course: ICourse;
  wallet: IWallet;
  selectedPricing: BillingCycle;
  onPricingChange: (pricing: BillingCycle) => void;
  onEnroll: () => void;
  timeLeft: { days: number; hours: number; minutes: number } | null;
  isEnrolled?: boolean;
  isEnrollmentExpired?: boolean;
  isProcessing?: boolean;
}

export const CourseEnrollmentCard = React.memo<CourseEnrollmentCardProps>(
  ({
    user,
    course,
    wallet,
    selectedPricing,
    onPricingChange,
    onEnroll,
    timeLeft,
    isEnrolled = false,
    isEnrollmentExpired = false,
    isProcessing = false,
  }: CourseEnrollmentCardProps) => {
    const t = useTranslations('Courses.singleCourse.enrollment');

    const handleEnroll = useCallback(() => {
      onEnroll();
    }, [onEnroll]);

    return (
      <Card className="border-outline-variant/20 sticky top-8 overflow-hidden rounded-4xl p-0 shadow-[0_32px_64px_rgba(30,26,36,0.08)]">
        <CardContent className="p-0">
          <div className="bg-muted relative h-60 w-full overflow-hidden rounded-t-4xl sm:h-80">
            {course.trailerUrl ? (
              <HeroVideoDialog
                videoSrc={course.trailerUrl}
                thumbnailSrc={course.thumbnailUrl ?? undefined}
                thumbnailAlt={course.name}
                className="h-full w-full"
                animationStyle="from-center"
              />
            ) : course.thumbnailUrl ? (
              <Image
                src={course.thumbnailUrl}
                alt={course.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="bg-muted flex h-full w-full items-center justify-center">
                <span className="text-muted-foreground text-sm font-semibold opacity-50">
                  {t('noPreviewAvailable')}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 p-8">
            {user && course.isPaid ? (
              <WalletBalanceAlert balance={wallet.balance} currency={wallet.currency} />
            ) : null}

            {course.isPaid ? (
              <PricingTabs
                pricing={course.pricing}
                selectedPricing={selectedPricing}
                onPricingChange={onPricingChange}
                timeLeft={timeLeft}
              />
            ) : (
              <FreePricing />
            )}

            <div className="space-y-3">
              <EnrollmentButtons
                isPaid={course.isPaid}
                selectedPricing={selectedPricing}
                onEnroll={handleEnroll}
                courseId={course._id}
                isEnrolled={isEnrolled}
                isEnrollmentExpired={isEnrollmentExpired}
                isProcessing={isProcessing}
              />
              {/* {course.isPaid && !isEnrolled && (
                <p className="text-muted-foreground mt-2 text-center text-xs font-semibold tracking-widest uppercase">
                  {t('moneyBackGuarantee')}
                </p>
              )} */}
            </div>

            <div className="border-outline-variant/10 space-y-4 border-t pt-4">
              <p className="text-xs font-bold tracking-widest uppercase opacity-60">
                {t('courseIncludes')}
              </p>
              <CourseIncludes learningObjectives={course.learningObjectives} />
            </div>

            <CourseMetadata language={course.language} updatedAt={course.updatedAt} />
          </div>
        </CardContent>
      </Card>
    );
  }
);

CourseEnrollmentCard.displayName = 'CourseEnrollmentCard';
