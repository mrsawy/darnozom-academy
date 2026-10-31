/** Lifecycle of an enrollment row. Missing/legacy rows are treated as ACTIVE. */
export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  /** Manual-transfer payment submitted but not yet approved by the organization: no content access. */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
}

/** Lifecycle of a manual-transfer (InstaPay / Vodafone Cash / custom) course payment. */
export enum CoursePaymentStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
