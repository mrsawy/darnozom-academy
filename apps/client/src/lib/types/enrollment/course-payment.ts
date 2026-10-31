import { BillingCycle } from '../course/enum/BillingCycle.enum';

export type CoursePaymentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface ICoursePaymentMethodField {
  key: string;
  label: string;
  type: 'TEXT' | 'IMAGE' | 'LINK';
  value: string;
  order: number;
}

export interface ICoursePaymentMethod {
  _id: string;
  key: string;
  label: string;
  fields: ICoursePaymentMethodField[];
}

export interface ICoursePaymentOptions {
  methods: ICoursePaymentMethod[];
  prices: Partial<Record<BillingCycle, { amount: number; currency: string }>>;
}

export interface ICoursePayment {
  _id: string;
  courseId: string;
  enrollmentId: string;
  userId: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: CoursePaymentStatus;
  rejectReason: string | null;
  receiptFileKey: string;
  receiptUrl?: string;
  methodSnapshot: { label: string; key: string };
  createdAt: string;
  user?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  course?: { name?: string };
}

export interface SubmitCoursePaymentInput {
  courseId: string;
  paymentMethodConfigId: string;
  billingCycle: BillingCycle;
  receiptFileKey: string;
}
