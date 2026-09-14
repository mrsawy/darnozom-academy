export enum AuthErrors {
  INVALID_CREDENTIALS = 'Invalid credentials',
  AUTHENTICATION_FAILED = 'Authentication failed',
  TOKEN_INVALID = 'Invalid token',
  TOKEN_EXPIRED = 'Token expired',
  REFRESH_TOKEN_EXPIRED = 'Refresh token expired',
  REFRESH_TOKEN_REVOKED = 'Refresh token revoked',
  REFRESH_FAILED = 'Failed to refresh session',
  ROLE_NOT_FOUND_CREATE_FIRST = 'Role not found - please seed roles first',
  EMAIL_ALREADY_REGISTERED = 'Email already registered',
  USERNAME_TAKEN = 'Username already taken',
  PHONE_TAKEN = 'Phone number already taken',
  LOGIN_PASSWORD_NOT_SET = 'Password not set for this account',
  GOOGLE_AUTH_FAILED = 'Google authentication failed',
  ORGANIZATION_DTO_REQUIRED_FOR_ROLE = 'Organization details are required for this role',
  ONBOARDING_ALREADY_COMPLETED = 'Onboarding already completed',
  ONBOARDING_REQUIRED = 'You must complete onboarding before performing this action',
  PASSWORD_RESET_TOKEN_INVALID = 'Invalid or expired password reset token',
}

export enum AuthSuccessMessages {
  PASSWORD_RESET_LINK_SENT = 'If an account exists, a reset link has been sent',
  PASSWORD_RESET_SUCCESS = 'Password reset successfully',
  ONBOARDING_COMPLETE = 'Onboarding completed successfully',
}
