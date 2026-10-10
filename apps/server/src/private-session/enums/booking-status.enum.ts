export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  /** Cancelled via an instructor-approved refund request; funds returned to the student's wallet. */
  REFUNDED = 'REFUNDED',
}
