/**
 * Auth-related error message keys. Use as translation keys on backend and frontend.
 */
export enum AuthErrors {
  INVALID_CREDENTIALS = 'invalidCredentials',
  ACCOUNT_DISABLED = 'accountDisabled',
  ACCOUNT_LOCKED = 'accountLocked',
  TOKEN_EXPIRED = 'tokenExpired',
  TOKEN_INVALID = 'tokenInvalid',
  EMAIL_NOT_VERIFIED = 'emailNotVerified',
  PASSWORD_RESET_EXPIRED = 'passwordResetExpired',
  PASSWORD_RESET_TOKEN_INVALID = 'passwordResetTokenInvalid',
  PASSWORD_RESET_COOLDOWN = 'passwordResetCooldown',
  PASSWORD_RESET_ACCOUNT_LOCKED = 'passwordResetAccountLocked',
  ACCOUNT_LOGGED_OUT_FROM_ANOTHER_DEVICE = 'accountLoggedOutFromAnotherDevice',
  USERNAME_TAKEN = 'usernameTaken',
  EMAIL_ALREADY_REGISTERED = 'emailAlreadyRegistered',
  PHONE_TAKEN = 'phoneTaken',
  ONBOARDING_REQUIRED = 'onboardingRequired',
  GOOGLE_EMAIL_NOT_VERIFIED = 'googleEmailNotVerified',
  GOOGLE_AUTH_FAILED = 'googleAuthFailed',
  ROLE_NOT_FOUND_CREATE_FIRST = 'roleNotFoundCreateFirst',
  FREE_PLAN_NOT_FOUND_CREATE_FIRST = 'freePlanNotFoundCreateFirst',
  LOGIN_PASSWORD_NOT_SET = 'loginPasswordNotSet',
  AUTHENTICATION_FAILED = 'authenticationFailed',
  /** No access token / session — caller must sign in (not a credential mismatch). */
  AUTHENTICATION_REQUIRED = 'authenticationRequired',
  REFRESH_TOKEN_REVOKED = 'refreshTokenRevoked',
  REFRESH_TOKEN_EXPIRED = 'refreshTokenExpired',
  REFRESH_FAILED = 'refreshFailed',
  PASSWORD_RESET_EMAIL_SEND_FAILED = 'passwordResetEmailSendFailed',
  ONBOARDING_ALREADY_COMPLETED = 'onboardingAlreadyCompleted',
  ORGANIZATION_DTO_REQUIRED_FOR_ROLE = 'organizationDtoRequiredForRole',
  /** Student onboarding must include parent account details. */
  PARENT_DTO_REQUIRED_FOR_STUDENT = 'parentDtoRequiredForStudent',
  /** Parent email must not be the same as the student's email. */
  PARENT_EMAIL_MUST_DIFFER_FROM_STUDENT = 'parentEmailMustDifferFromStudent',
  /** Student and parent cannot share the same phone number (phones are unique per user). */
  PARENT_PHONE_MUST_DIFFER_FROM_STUDENT = 'parentPhoneMustDifferFromStudent',
  /** Parent account fields are only valid when completing onboarding as a student. */
  PARENT_DTO_NOT_ALLOWED_FOR_ROLE = 'parentDtoNotAllowedForRole',
  /** Organization signup requires accepting the platform rules & privacy policy. */
  TERMS_NOT_ACCEPTED = 'termsNotAccepted',
  /** Organization signup as SUPER_ADMIN requires submitting identity documents. */
  IDENTITY_REQUIRED_FOR_ORGANIZATION = 'identityRequiredForOrganization',
}

export enum AuthSuccessMessages {
  PASSWORD_RESET_LINK_SENT = 'passwordResetLinkSent',
  PASSWORD_RESET_OTP_SENT = 'passwordResetOtpSent',
  PASSWORD_RESET_OTP_VERIFIED = 'passwordResetOtpVerified',
  PASSWORD_RESET_SUCCESS = 'passwordResetSuccess',
  ONBOARDING_COMPLETE = 'onboardingComplete',
}
