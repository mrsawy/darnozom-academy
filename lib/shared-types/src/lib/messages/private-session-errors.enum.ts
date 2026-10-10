/**
 * Private session error and success message keys. Use as translation keys on backend and frontend.
 */
export enum PrivateSessionErrors {
  SESSION_NOT_FOUND = 'privateSessionNotFound',
  BOOKING_NOT_FOUND = 'sessionBookingNotFound',
  SLOT_ALREADY_BOOKED = 'sessionSlotAlreadyBooked',
  SLOT_CAPACITY_FULL = 'sessionSlotCapacityFull',
  CANNOT_BOOK_OWN_SESSION = 'cannotBookOwnSession',
  RESCHEDULE_ALREADY_PENDING = 'rescheduleAlreadyPending',
  RESCHEDULE_NOT_FOUND = 'rescheduleRequestNotFound',
  BOOKING_NOT_CONFIRMED = 'sessionBookingNotConfirmed',
  BOOKING_ALREADY_CANCELLED = 'sessionBookingAlreadyCancelled',
  BOOKING_ALREADY_COMPLETED = 'sessionBookingAlreadyCompleted',
  NOT_SESSION_PARTICIPANT = 'notSessionParticipant',
  INSTRUCTOR_NOT_FOUND = 'sessionInstructorNotFound',
  INVALID_SLOT = 'invalidSessionSlot',
  /** Card/direct checkout was chosen but no payment provider was supplied. */
  PAYMENT_PROVIDER_REQUIRED = 'privateSessionPaymentProviderRequired',
  PAYMENT_CHECKOUT_FAILED = 'privateSessionPaymentCheckoutFailed',
  SESSION_INACTIVE = 'sessionIsInactive',
  CANNOT_RESPOND_OWN_REQUEST = 'cannotRespondToOwnRescheduleRequest',
  HAS_UPCOMING_BOOKINGS = 'cannotDeleteSessionWithUpcomingBookings',
  /** Student/parent may not cancel a confirmed (paid) booking — contact instructor/org. */
  STUDENT_CANNOT_CANCEL_CONFIRMED = 'studentCannotCancelConfirmedPrivateBooking',
  /** A refund request is already pending for this booking. */
  REFUND_ALREADY_PENDING = 'refundAlreadyPending',
  /** No refund request exists (or it is not pending) for this booking. */
  REFUND_REQUEST_NOT_FOUND = 'refundRequestNotFound',
  /** The refund requester cannot approve/reject their own request. */
  CANNOT_RESPOND_OWN_REFUND = 'cannotRespondToOwnRefundRequest',
  /** Only the paying student/parent may request a refund. */
  ONLY_STUDENT_CAN_REQUEST_REFUND = 'onlyStudentCanRequestRefund',
  /** Refunds only apply to a confirmed, paid booking. */
  REFUND_NOT_ALLOWED = 'refundNotAllowed',
  /** The session join window has not opened yet. */
  BOOKING_NOT_JOINABLE_YET = 'bookingNotJoinableYet',
  /** The session has already ended. */
  SESSION_ENDED = 'sessionEnded',
  /** The requested reschedule time does not match an available future slot. */
  RESCHEDULE_SLOT_UNAVAILABLE = 'rescheduleSlotUnavailable',
}

export enum PrivateSessionSuccessMessages {
  SESSION_CREATED = 'privateSessionCreated',
  SESSION_UPDATED = 'privateSessionUpdated',
  SESSION_DELETED = 'privateSessionDeleted',
  BOOKING_CREATED = 'sessionBookingCreated',
  BOOKING_CONFIRMED = 'sessionBookingConfirmed',
  BOOKING_CANCELLED = 'sessionBookingCancelled',
  BOOKING_COMPLETED = 'sessionBookingCompleted',
  RESCHEDULE_REQUESTED = 'rescheduleRequested',
  RESCHEDULE_APPROVED = 'rescheduleApproved',
  RESCHEDULE_REJECTED = 'rescheduleRejected',
  NO_SHOW_MARKED = 'sessionNoShowMarked',
  REFUND_REQUESTED = 'refundRequested',
  REFUND_APPROVED = 'refundApproved',
  REFUND_REJECTED = 'refundRejected',
}
