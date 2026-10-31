/**
 * Enrollment-related error message keys. Use as translation keys on backend and frontend.
 */
export enum EnrollmentErrors {
  ENROLLMENT_NOT_FOUND = 'enrollmentNotFound',
  ENROLLMENT_EXPIRED = 'enrollmentExpired',
  MUST_BE_STUDENT_TO_ENROLL = 'mustBeStudentToEnroll',
  ENROLLMENT_PENDING_PAYMENT = 'enrollmentPendingPayment',
  ALREADY_ENROLLED = 'alreadyEnrolled',
  COURSE_PAYMENT_NOT_FOUND = 'coursePaymentNotFound',
  COURSE_PAYMENT_NOT_REVIEWABLE = 'coursePaymentNotReviewable',
  COURSE_PAYMENT_METHOD_UNAVAILABLE = 'coursePaymentMethodUnavailable',
  COURSE_PAYMENT_RECEIPT_REQUIRED = 'coursePaymentReceiptRequired',
  COURSE_PAYMENT_REJECT_REASON_REQUIRED = 'coursePaymentRejectReasonRequired',
  COURSE_IS_FREE = 'courseIsFree',
}

/**
 * Enrollment-related success message keys. Use as translation keys on backend and frontend.
 */
export enum EnrollmentSuccessMessages {
  QUIZ_SUBMITTED = 'quizSubmittedSuccessfully',
  PROJECT_SUBMITTED = 'projectSubmittedSuccessfully',
  ATTENDANCE_MARKED = 'attendanceMarkedSuccessfully',
  ASSIGNMENT_SUBMITTED = 'assignmentSubmittedSuccessfully',
  ASSIGNMENT_GRADED = 'assignmentGradedSuccessfully',
}
