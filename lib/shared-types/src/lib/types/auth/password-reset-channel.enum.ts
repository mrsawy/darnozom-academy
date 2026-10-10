/**
 * How a password-reset credential is delivered / stored.
 * - `link` — web email link token (also used after mobile OTP exchange)
 * - `otp` — mobile 6-digit code (must be verified before reset)
 */
export enum PasswordResetChannel {
  LINK = 'link',
  OTP = 'otp',
}
