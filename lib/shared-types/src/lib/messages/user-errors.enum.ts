/**
 * User-related error message keys. Use as translation keys on backend and frontend.
 */
export enum UserErrors {
  USER_NOT_FOUND = 'userNotFound',
  EMAIL_ALREADY_EXISTS = 'emailAlreadyExists',
  USERNAME_ALREADY_EXISTS = 'usernameAlreadyExists',
  ORGANIZATION_NOT_FOUND = 'organizationNotFound',
  INVALID_USER_STATE = 'invalidUserState',
  USER_NOT_A_STUDENT = 'userNotAStudent',
  CANNOT_ASSIGN_PLATFORM_ADMIN = 'cannotAssignPlatformAdminRole',
  ORGANIZATION_ID_REQUIRED = 'organizationIdRequired',
  PHONE_REQUIRED_FOR_NON_OAUTH = 'phoneRequiredForNonOAuthUsers',
  PASSWORD_REQUIRED_FOR_NON_OAUTH = 'passwordRequiredForNonOAuthUsers',
  /** Mongo duplicate key: send as `fieldValueAlreadyExists|field|value` */
  FIELD_VALUE_ALREADY_EXISTS = 'fieldValueAlreadyExists',
  FAILED_TO_CREATE_USER = 'failedToCreateUser',
  ONLY_SUPER_ADMIN_CAN_COMPLETE_ORG_ONBOARDING = 'onlySuperAdminCanCompleteOrgOnboarding',
}

export enum UserSuccessMessages {
  USER_DATA_FETCHED = 'userDataFetchedSuccessfully',
  USER_MATCHED_NO_CHANGES = 'userMatchedNoChanges',
  USER_UPDATED_SUCCESSFULLY = 'userUpdatedSuccessfully',
  ORGANIZATION_ONBOARDING_COMPLETED = 'organizationOnboardingCompleted',
}
