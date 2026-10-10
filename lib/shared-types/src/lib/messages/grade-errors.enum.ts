/**
 * Grade-related message keys. Use as translation keys on backend and frontend.
 */
export enum GradeErrors {
  GRADE_NOT_FOUND = 'gradeNotFound',
  GRADE_NAME_ALREADY_EXISTS = 'gradeNameAlreadyExists',
  GRADE_IN_USE_CANNOT_DELETE = 'gradeInUseCannotDelete',
}

export enum GradeSuccessMessages {
  GRADE_CREATED = 'gradeCreatedSuccessfully',
  GRADE_UPDATED = 'gradeUpdatedSuccessfully',
  GRADE_DELETED = 'gradeDeletedSuccessfully',
}
