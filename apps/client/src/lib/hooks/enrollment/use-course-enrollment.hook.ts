'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import {
  AuthErrors,
  Currency,
  Roles,
  isUnauthenticatedError,
} from '@darnozom/shared-types';
import { useRouter } from '@/i18n/navigation';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { useWallet } from '@/lib/hooks/wallet/use-wallet';
import useUserStore from '@/lib/store/userStore';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import {
  enrollToFreeCourse,
  enrollChildToFreeCourse,
  enrollToCourse,
} from '@/lib/actions/enrollment/enrollToCourse.action';
import { renewEnrollment } from '@/lib/actions/enrollment/renewEnrollment.action';
import { getEnrollmentByCourse } from '@/lib/actions/enrollment/getEnrollmentByCourse.action';
import {
  ROUTE_ONBOARDING,
  ROUTE_PARENT_DASHBOARD,
  ROUTE_STUDENT_COURSE,
  ROUTE_STUDENT_COURSES,
} from '@/lib/data/constants/routes.constants';
import { IEnrollment, SubscriptionStatus } from '@/lib/types/enrollment/enrollment.interface';
import { enrollmentKeys } from '@/lib/hooks/enrollment/enrollments.hook';
import { getDiscountedPrice, isDiscountActive } from '@/lib/utils/discount.utils';
import { useViewerCurrency } from '@/lib/hooks/currency/use-viewer-currency.hook';
import { BillingCycle } from '@/lib/types/course/enum/BillingCycle.enum';
import { ICourseOverview, PricingDetails } from '@/lib/types/course/course.interface';
import { IUser } from '@/lib/types/user/user.interface';
import { IWallet } from '@/lib/types/wallet/IWallet';
import { PaymentMethod, PaymentProvider } from '@/lib/types/payment/payment.interface';
import { PaymentResponse } from '@/lib/types/payment/directPaymentResponse.interface';
import type { IChild } from '@/lib/types/parent/parent-children.interface';
import { UserMainRoles } from '@/lib/data/userRole.enum';
import { userKeys } from '@/lib/hooks/user/use-user.hook';
import { handleUnauthenticatedSession } from '@/lib/utils/auth/handle-unauthenticated-session';

/** GUEST or explicit incomplete onboarding — must finish /onboarding before purchase. */
function needsOnboarding(candidate: IUser | null | undefined): boolean {
  if (!candidate) return false;
  return candidate.onboardingComplete === false || candidate.roleName === Roles.GUEST;
}

export type DialogType =
  | 'insufficient-balance'
  | 'confirm-enrollment'
  | 'payment-method-selection'
  | 'confirm-free-enrollment'
  | 'child-selection'
  | 'renewal'
  | null;

interface UseCourseEnrollmentOptions {
  course: ICourseOverview;
  user: IUser | null;
}

function useDiscountTimer(course: ICourseOverview, selectedPricing: BillingCycle) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(
    null
  );

  useEffect(() => {
    if (!course.isPaid) return;

    const state = { timer: undefined as ReturnType<typeof setInterval> | undefined };

    const update = () => {
      const pricing = course.pricing[selectedPricing];
      if (!pricing?.discountEndDate || !isDiscountActive(pricing)) {
        setTimeLeft(null);
        return;
      }
      const diff = new Date(pricing.discountEndDate).getTime() - Date.now();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        });
      } else {
        setTimeLeft(null);
        if (state.timer) clearInterval(state.timer);
      }
    };

    update();
    state.timer = setInterval(update, 60_000);
    return () => {
      if (state.timer) clearInterval(state.timer);
    };
  }, [selectedPricing, course.isPaid, course.pricing]);

  return timeLeft;
}

export function useCourseEnrollment({ course, user }: UseCourseEnrollmentOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tMutations = useTranslations('mutations');
  const tErrors = useTranslations('errors');
  const tRenewal = useTranslations('StudentCourses.renewalModal');

  // Skip wallet fetch when unauthenticated — no token, no authorized request
  const { data: wallet = { _id: '', balance: 0 } as IWallet } = useWallet({
    enabled: !!user,
  });

  const userRole = user?.roleName?.toUpperCase();
  const isStudent = userRole === Roles.STUDENT || userRole === Roles.GUEST;
  const isParent = userRole === UserMainRoles.PARENT || userRole === Roles.PARENT;
  const isGuest = userRole === Roles.GUEST;

  // Check if user is already enrolled in this course (only relevant for students)
  const { data: existingEnrollment } = useQuery({
    queryKey: ['enrollment-by-course', course._id, user?._id],
    queryFn: () => getEnrollmentByCourse(course._id),
    enabled: !!user && isStudent,
    staleTime: 5 * 60 * 1000,
  });

  const isEnrolled = !!existingEnrollment;
  const isEnrollmentExpired =
    existingEnrollment?.subscription?.status === SubscriptionStatus.EXPIRED ||
    (existingEnrollment?.subscription?.ends_at &&
      new Date(existingEnrollment.subscription.ends_at) < new Date());

  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedPricing, setSelectedPricing] = useState<BillingCycle>(() => {
    if (course.pricing?.[BillingCycle.MONTHLY]) return BillingCycle.MONTHLY;
    if (course.pricing?.[BillingCycle.YEARLY]) return BillingCycle.YEARLY;
    return BillingCycle.ONE_TIME;
  });
  const [selectedChild, setSelectedChild] = useState<IChild | null>(null);
  const [isRedirectingToPayment] = useState(false);

  // Refs keep latest values available inside stale mutation closures
  const selectedChildRef = useRef<IChild | null>(null);
  selectedChildRef.current = selectedChild;
  // Tracks the enrollmentId of an expired child enrollment — ref only, no re-render needed
  const childRenewalEnrollmentIdRef = useRef<string | null>(null);
  // Resume enroll → payment after the auth dialog succeeds
  const pendingEnrollmentAfterAuthRef = useRef(false);
  const handleAuthenticatedRef = useRef<() => void>(() => {
    // replaced once handleAuthenticated is defined
  });

  const timeLeft = useDiscountTimer(course, selectedPricing);

  // timeLeft is a dependency so price recomputes when a discount expires
  // Same conversion the server charges with (original price, else priceUSD × rate)
  const { currency: viewerCurrency, toDisplayPrice } = useViewerCurrency();
  const { currentPrice, currentPriceCurrency } = useMemo(() => {
    void timeLeft;
    const pricing: PricingDetails | undefined = course.isPaid
      ? course.pricing[selectedPricing]
      : undefined;
    const display = pricing
      ? toDisplayPrice({
          price: pricing.originalPrice,
          currency: pricing.originalCurrency,
          priceUSD: pricing.priceUSD,
        })
      : null;
    if (!pricing || !display) {
      return { currentPrice: 0, currentPriceCurrency: viewerCurrency };
    }
    const amount = isDiscountActive(pricing)
      ? getDiscountedPrice(display.amount, pricing)
      : display.amount;
    return { currentPrice: amount, currentPriceCurrency: display.currency };
  }, [course, selectedPricing, toDisplayPrice, viewerCurrency, timeLeft]);

  /** Promotes the local Zustand store after a GUEST is upgraded on the server. */
  const promoteGuestLocally = useCallback(() => {
    if (!isGuest) return;
    const currentUser = useUserStore.getState().user;
    if (currentUser) {
      useUserStore.getState().setUser({
        ...currentUser,
        roleName: Roles.STUDENT,
        onboardingComplete: true,
      });
    }
  }, [isGuest]);

  const openAuthForEnrollment = useCallback(() => {
    pendingEnrollmentAfterAuthRef.current = true;
    handleUnauthenticatedSession({
      onAuthenticated: () => handleAuthenticatedRef.current(),
    });
  }, []);

  const redirectToOnboarding = useCallback(() => {
    pendingEnrollmentAfterAuthRef.current = false;
    setDialogType(null);
    toast.error(tErrors('onboardingRequired'));
    router.push(ROUTE_ONBOARDING);
  }, [router, tErrors]);

  const handleEnrollmentError = useCallback(
    (error: unknown) => {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('userId_1_courseId_1')) {
        toast.error(tMutations('alreadyEnrolledInCourse'));
        return;
      }
      if (
        msg === String(AuthErrors.ONBOARDING_REQUIRED) ||
        msg.endsWith(String(AuthErrors.ONBOARDING_REQUIRED))
      ) {
        redirectToOnboarding();
        return;
      }
      if (isUnauthenticatedError(msg)) {
        openAuthForEnrollment();
        return;
      }
      toast.error(msg ? translateApiMessage(msg, tErrors) : tMutations('enrollmentFailed'));
    },
    [openAuthForEnrollment, redirectToOnboarding, tErrors, tMutations]
  );

  /** Student courses keep a 5m staleTime; invalidate so the new enrollment shows without a hard refresh. */
  const invalidateAfterEnrollmentChange = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: enrollmentKeys.student() });
    void queryClient.invalidateQueries({
      queryKey: ['enrollment-by-course', course._id],
    });
  }, [queryClient, course._id]);

  // ── Free enrollment ────────────────────────────────────────────────────────

  const freeEnrollMutation = useMutation({
    mutationFn: async () => {
      const child = selectedChildRef.current;
      if (isParent && child) return enrollChildToFreeCourse(course._id, child._id);
      return enrollToFreeCourse(course._id);
    },
    onSuccess: (data) => {
      setDialogType(null);
      setSelectedChild(null);
      promoteGuestLocally();
      invalidateAfterEnrollmentChange();
      toast.success(
        isParent ? tMutations('enrolledChildInCourse') : tMutations('enrolledInCourse')
      );
      if (isParent) {
        router.push(ROUTE_PARENT_DASHBOARD);
      } else if (data?._id) {
        router.push(ROUTE_STUDENT_COURSE(data._id));
      } else {
        router.push(ROUTE_STUDENT_COURSES);
      }
    },
    onError: handleEnrollmentError,
  });

  // ── Paid enrollment (wallet or direct) ────────────────────────────────────

  const paidEnrollMutation = useMutation({
    mutationFn: (paymentMethod: PaymentMethod) => {
      const child = selectedChildRef.current;
      return enrollToCourse({
        courseId: course._id,
        billingCycle: selectedPricing,
        paymentMethod,
        provider: PaymentProvider.PAYMOB,
        currency: user?.preferredCurrency ?? Currency.DEFAULT,
        ...(isParent && child ? { childId: child._id } : {}),
      });
    },
    onSuccess: (response, paymentMethod) => {
      setDialogType(null);
      if (isParent) setSelectedChild(null);

      if (paymentMethod === PaymentMethod.WALLET) {
        promoteGuestLocally();
        invalidateAfterEnrollmentChange();
        toast.success(
          isParent ? tMutations('enrolledChildInCourse') : tMutations('enrolledInCourse')
        );
        const enrollment = response as IEnrollment;
        if (isParent) {
          router.push(ROUTE_PARENT_DASHBOARD);
        } else if (enrollment?._id) {
          router.push(ROUTE_STUDENT_COURSE(enrollment._id));
        } else {
          router.push(ROUTE_STUDENT_COURSES);
        }
      } else {
        globalThis.open((response as PaymentResponse).paymentUrl, '_blank');
      }
    },
    onError: handleEnrollmentError,
  });

  const isEnrollmentProcessing =
    freeEnrollMutation.isPending || paidEnrollMutation.isPending || isRedirectingToPayment;

  // ── Renewal mutation ───────────────────────────────────────────────────────

  const renewalMutation = useMutation({
    mutationFn: ({
      billingCycle,
      paymentMethod,
    }: {
      billingCycle: BillingCycle;
      paymentMethod: PaymentMethod;
    }) => {
      // Parent renewing a child's enrollment uses childRenewalEnrollmentId; self-renewal uses existingEnrollment
      const enrollmentId = childRenewalEnrollmentIdRef.current ?? existingEnrollment?._id;
      if (!enrollmentId) throw new Error('No enrollment to renew');
      return renewEnrollment({
        enrollmentId,
        billingCycle,
        paymentMethod,
        provider: PaymentProvider.PAYMOB,
        currency: user?.preferredCurrency ?? Currency.DEFAULT,
      });
    },
    onSuccess: (response, { paymentMethod }) => {
      setDialogType(null);
      const renewedEnrollmentId = childRenewalEnrollmentIdRef.current ?? existingEnrollment?._id;
      childRenewalEnrollmentIdRef.current = null;
      if (paymentMethod === PaymentMethod.WALLET) {
        toast.success(tRenewal('renewed'));
        invalidateAfterEnrollmentChange();
        if (isParent) {
          router.push(ROUTE_PARENT_DASHBOARD);
        } else if (renewedEnrollmentId) {
          router.push(ROUTE_STUDENT_COURSE(renewedEnrollmentId));
        } else {
          router.push(ROUTE_STUDENT_COURSES);
        }
      } else {
        globalThis.open((response as PaymentResponse).paymentUrl, '_blank');
      }
    },
    onError: () => {
      toast.error(tRenewal('renewFailed'));
    },
  });

  const handleRenew = useCallback(
    (billingCycle: BillingCycle, paymentMethod: 'WALLET' | 'DIRECT') => {
      renewalMutation.mutate({
        billingCycle,
        paymentMethod: paymentMethod === 'WALLET' ? PaymentMethod.WALLET : PaymentMethod.DIRECT,
      });
    },
    [renewalMutation]
  );

  // ── Shared flow helpers ────────────────────────────────────────────────────

  /** Determines next step after user/child eligibility is confirmed. */
  const proceedToPaidFlow = useCallback(() => {
    const hasEnoughBalance = wallet.balance >= currentPrice;
    const preferredCurrency =
      user?.preferredCurrency ?? useUserStore.getState().user?.preferredCurrency;
    const currencyMatches = preferredCurrency === course.pricing[selectedPricing]?.originalCurrency;

    if (hasEnoughBalance && currencyMatches) {
      setDialogType('payment-method-selection');
    } else {
      paidEnrollMutation.mutate(PaymentMethod.DIRECT);
    }
  }, [
    wallet.balance,
    currentPrice,
    user?.preferredCurrency,
    course.pricing,
    selectedPricing,
    paidEnrollMutation,
  ]);

  /**
   * After a successful login/signup in the auth dialog, continue enrollment so
   * the user lands on Paymob (or free-enroll confirm) without clicking again.
   */
  const handleAuthenticated = useCallback(() => {
    if (!pendingEnrollmentAfterAuthRef.current) {
      setDialogType(null);
      return;
    }
    pendingEnrollmentAfterAuthRef.current = false;
    void queryClient.invalidateQueries({ queryKey: userKeys.me() });

    const authenticatedUser = useUserStore.getState().user;
    if (!authenticatedUser) {
      setDialogType(null);
      return;
    }

    if (needsOnboarding(authenticatedUser)) {
      redirectToOnboarding();
      return;
    }

    const role = authenticatedUser.roleName?.toUpperCase();
    const asParent = role === String(UserMainRoles.PARENT) || role === String(Roles.PARENT);
    const asStudent = role === String(Roles.STUDENT);

    if (asParent) {
      setDialogType('child-selection');
      return;
    }
    if (!asStudent) {
      setDialogType(null);
      toast.error(tErrors('mustBeStudentToEnroll'));
      return;
    }
    if (!course.isPaid) {
      setDialogType('confirm-free-enrollment');
      return;
    }

    // Wallet may not be loaded yet right after login — go straight to Paymob.
    setDialogType(null);
    paidEnrollMutation.mutate(PaymentMethod.DIRECT);
  }, [course.isPaid, paidEnrollMutation, queryClient, redirectToOnboarding, tErrors]);

  handleAuthenticatedRef.current = handleAuthenticated;

  const handleEnroll = useCallback(() => {
    if (!user) {
      openAuthForEnrollment();
      return;
    }
    if (needsOnboarding(user)) {
      redirectToOnboarding();
      return;
    }
    if (isParent) {
      setDialogType('child-selection');
      return;
    }
    if (!isStudent || isGuest) {
      toast.error(tErrors('mustBeStudentToEnroll'));
      return;
    }
    // If already enrolled and expired, open renewal dialog
    if (isEnrollmentExpired) {
      setDialogType('renewal');
      return;
    }
    // If already enrolled and active, redirect to the enrollment in student dashboard
    if (isEnrolled && !isEnrollmentExpired) {
      if (existingEnrollment?._id) {
        router.push(ROUTE_STUDENT_COURSE(existingEnrollment._id));
      } else {
        router.push(ROUTE_STUDENT_COURSES);
      }
      return;
    }
    if (!course.isPaid) {
      setDialogType('confirm-free-enrollment');
      return;
    }
    proceedToPaidFlow();
  }, [
    user,
    isParent,
    isStudent,
    isGuest,
    isEnrollmentExpired,
    isEnrolled,
    existingEnrollment?._id,
    course.isPaid,
    proceedToPaidFlow,
    openAuthForEnrollment,
    redirectToOnboarding,
    router,
    tErrors,
  ]);

  const handleChildSelected = useCallback(
    (
      child: IChild,
      enrollmentStatus?: { enrolled: boolean; expired: boolean; enrollmentId?: string }
    ) => {
      setSelectedChild(child);
      selectedChildRef.current = child;
      setDialogType(null);

      // Child has an expired enrollment — open renewal dialog instead of re-enrolling
      if (enrollmentStatus?.enrolled && enrollmentStatus.expired && enrollmentStatus.enrollmentId) {
        childRenewalEnrollmentIdRef.current = enrollmentStatus.enrollmentId;
        setDialogType('renewal');
        return;
      }

      if (!course.isPaid) {
        setDialogType('confirm-free-enrollment');
        return;
      }
      proceedToPaidFlow();
    },
    [course.isPaid, proceedToPaidFlow]
  );

  const handleCloseDialog = useCallback(() => {
    setDialogType(null);
    childRenewalEnrollmentIdRef.current = null;
    pendingEnrollmentAfterAuthRef.current = false;
  }, []);

  const handlePricingChange = useCallback(
    (pricing: BillingCycle) => setSelectedPricing(pricing),
    []
  );

  return {
    // State
    dialogType,
    selectedPricing,
    selectedChild,
    wallet,
    timeLeft,
    currentPrice,
    currentPriceCurrency,
    isParent,
    isEnrolled,
    isEnrollmentExpired,
    existingEnrollment,
    // Mutations
    freeEnrollMutation,
    paidEnrollMutation,
    renewalMutation,
    isEnrollmentProcessing,
    // Handlers
    handleEnroll,
    handleChildSelected,
    handleCloseDialog,
    handlePricingChange,
    handleRenew,
  };
}
