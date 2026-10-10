/**
 * Verification (email OTP) API message keys. Backend returns these as plain strings;
 * dynamic errors append `|value` (e.g. cooldown seconds). Frontend translates via next-intl.
 */
export enum VerificationErrors {
  ORGANIZATION_SUPER_ADMIN_NOT_FOUND = 'organizationSuperAdminNotFound',
  EMAIL_ALREADY_VERIFIED = 'emailAlreadyVerified',
  OTP_RESEND_COOLDOWN = 'otpResendCooldown',
  OTP_NOT_FOUND = 'otpNotFoundRequestNew',
  INVALID_VERIFICATION_CODE = 'invalidVerificationCode',
  OTP_ACCOUNT_LOCKED_MINUTES = 'otpAccountLockedMinutes',
}

export enum VerificationSuccessMessages {
  VERIFICATION_CODE_SENT = 'verificationCodeSentToEmail',
  EMAIL_VERIFIED_SUCCESS = 'emailVerifiedSuccessfully',
}
