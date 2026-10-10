/**
 * Parent-related error message keys. Use as translation keys on backend and frontend.
 */
export enum ParentErrors {
  PARENT_NOT_FOUND = 'parentNotFound',
  CHILD_NOT_LINKED = 'childNotLinked',
  CANNOT_EDIT_USERNAME_EMAIL = 'cannotEditUsernameEmail',
  USER_NOT_A_PARENT = 'userNotAParent',
  CHILD_NOT_FOUND = 'childNotFound',
  INVALID_ENROLLMENT_ID = 'invalidEnrollmentId',
  INVALID_CHILD_ID = 'invalidChildId',
  STUDENT_ALREADY_HAS_PARENT = 'studentAlreadyHasParent',
}

export enum ParentSuccessMessages {
  CHILD_UPDATED = 'childUpdatedSuccessfully',
  PARENT_CREATED = 'parentCreatedSuccessfully',
}
