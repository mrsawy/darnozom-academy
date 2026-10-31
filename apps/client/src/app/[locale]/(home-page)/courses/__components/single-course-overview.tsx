'use client';

import { ICourseOverview } from '@/lib/types/course/course.interface';
import { IUser } from '@/lib/types/user/user.interface';
import { CourseEnrollmentCard } from '@/components/organs/course-enrollment-card';
import { PaymentMethodSelectionDialog } from '@/components/organs/payment-method-selection-dialog';
import { ConfirmFreeEnrollmentDialog } from '@/components/organs/confirm-free-enrollment-dialog';
import { ChildSelectionDialog } from '@/components/organs/child-selection-dialog/child-selection-dialog';
import { RenewalDialog } from '@/components/organs/renewal-dialog';
import { CourseTransferPaymentDialog } from '@/components/organs/course-transfer-payment-dialog/course-transfer-payment-dialog';
import { PaymentMethod } from '@/lib/types/payment/payment.interface';
import { useCourseEnrollment } from '@/lib/hooks/enrollment/use-course-enrollment.hook';

interface SingleCourseOverViewProps {
  course: ICourseOverview;
  user?: IUser | null;
}

function SingleCourseOverView({ course, user = null }: SingleCourseOverViewProps) {
  const {
    dialogType,
    selectedPricing,
    wallet,
    timeLeft,
    currentPrice,
    currentPriceCurrency,
    isEnrolled,
    isEnrollmentExpired,
    isPendingPayment,
    isPaymentRejected,
    paymentRejectReason,
    canPayByTransfer,
    handlePayByTransfer,
    freeEnrollMutation,
    paidEnrollMutation,
    renewalMutation,
    isEnrollmentProcessing,
    handleEnroll,
    handleChildSelected,
    handleCloseDialog,
    handlePricingChange,
    handleRenew,
  } = useCourseEnrollment({ course, user });

  return (
    <>
      <CourseEnrollmentCard
        user={user}
        course={course}
        wallet={wallet}
        selectedPricing={selectedPricing}
        onPricingChange={handlePricingChange}
        onEnroll={handleEnroll}
        timeLeft={timeLeft}
        isEnrolled={isEnrolled}
        isEnrollmentExpired={!!isEnrollmentExpired}
        isProcessing={isEnrollmentProcessing}
        isPendingPayment={isPendingPayment}
        isPaymentRejected={isPaymentRejected}
        canPayByTransfer={canPayByTransfer}
        onPayByTransfer={handlePayByTransfer}
      />

      <CourseTransferPaymentDialog
        open={dialogType === 'transfer-payment'}
        onClose={handleCloseDialog}
        courseId={course._id}
        courseName={course.name}
        billingCycle={selectedPricing}
        rejectReason={isPaymentRejected ? paymentRejectReason : null}
      />

      <ChildSelectionDialog
        open={dialogType === 'child-selection'}
        onClose={handleCloseDialog}
        onSelect={handleChildSelected}
        courseId={course._id}
      />

      <ConfirmFreeEnrollmentDialog
        open={dialogType === 'confirm-free-enrollment'}
        onClose={handleCloseDialog}
        onConfirm={() => freeEnrollMutation.mutate()}
        courseName={course.name}
      />

      <PaymentMethodSelectionDialog
        open={dialogType === 'payment-method-selection'}
        onClose={handleCloseDialog}
        onSelectWallet={() => paidEnrollMutation.mutate(PaymentMethod.WALLET)}
        onSelectDirect={() => paidEnrollMutation.mutate(PaymentMethod.DIRECT)}
        courseName={course.name}
        price={currentPrice}
        currency={currentPriceCurrency}
        currentBalance={wallet.balance}
        balanceCurrency={wallet.currency}
      />

      <RenewalDialog
        open={dialogType === 'renewal'}
        onClose={handleCloseDialog}
        onRenew={handleRenew}
        courseName={course.name}
        isLoading={renewalMutation.isPending}
      />
    </>
  );
}

export default SingleCourseOverView;
