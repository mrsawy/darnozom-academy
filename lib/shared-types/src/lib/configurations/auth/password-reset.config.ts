/** Shared password-reset OTP / cooldown settings (server + mobile). */
export const PASSWORD_RESET = {
  OTP_LENGTH: 6,
  COOLDOWN_MS: 60_000,
  /** Token / OTP TTL in seconds (matches Mongo TTL index). */
  TTL_SECONDS: 900,
} as const;
