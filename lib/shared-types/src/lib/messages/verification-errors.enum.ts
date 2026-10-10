/**
 * Email / OTP verification error keys. Use as exception messages on the backend
 * and as next-intl keys under SharedApiErrors (optionally with JSON params after `|`).
 */
export enum VerificationErrors {
  EMAIL_ALREADY_VERIFIED = 'emailAlreadyVerified',
  ORGANIZATION_SUPER_ADMIN_NOT_FOUND = 'organizationSuperAdminNotFound',
  OTP_RESEND_COOLDOWN = 'otpResendCooldown',
  NO_OTP_FOUND = 'noOtpFound',
  INVALID_OTP = 'invalidOtp',
  OTP_LOCKOUT_MINUTES = 'otpLockoutMinutes',
}

/** Wire format: `${code}|${JSON.stringify(params)}` for parameterized translations. */
export function verificationErrorWithParams(
  code: VerificationErrors,
  params: Record<string, string | number>,
): string {
  return `${code}|${JSON.stringify(params)}`;
}
