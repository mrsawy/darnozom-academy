import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { PaymentPurpose } from '@darnozom/shared-types';

export interface PaymobWebhookMetadata {
  userId?: string;
  courseId?: string;
  billingCycle?: BillingCycle;
  purpose?: PaymentPurpose;
  /** Set when a parent initiated the purchase on behalf of a child. */
  parentId?: string;
  /** The child to enroll when parentId is present. */
  childId?: string;
  /** Legacy: booking created before deferred-checkout change. */
  bookingId?: string;
  /** Session ID for private session purchases. */
  sessionId?: string;
  /** Slot subdocument id — required for deferred booking creation after Paymob. */
  slotId?: string;
  /** Student (or child) id for the booking. */
  studentId?: string;
  /** Paying user (card holder). */
  payerUserId?: string;
  organizationId?: string;
  notes?: string;
  /** Set when purpose is COURSE_PURCHASE and it is a renewal (not initial enrollment). */
  enrollmentId?: string;
}
