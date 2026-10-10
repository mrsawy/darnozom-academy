/**
 * Organization account-level error keys. Use as exception messages on the
 * backend and as next-intl keys on the frontend.
 */
export enum OrganizationErrors {
  /** Org account is still awaiting platform-admin approval; content creation is blocked. */
  ACCOUNT_PENDING_APPROVAL = 'accountPendingApproval',
  /** Org account was rejected by the platform admin. */
  ACCOUNT_REJECTED = 'accountRejected',
  /** Approval requires the org email to be verified first. */
  EMAIL_MUST_BE_VERIFIED_FIRST = 'emailMustBeVerifiedFirst',
  /** Approval requires submitted identity documents. */
  IDENTITY_MUST_BE_SUBMITTED_FIRST = 'identityMustBeSubmittedFirst',
}

export enum OrganizationSuccessMessages {
  ACCOUNT_APPROVED = 'accountApproved',
  ACCOUNT_REJECTED_SUCCESS = 'accountRejectedSuccess',
}
