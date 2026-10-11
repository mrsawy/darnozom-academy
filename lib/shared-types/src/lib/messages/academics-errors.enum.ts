/**
 * Academics (programs, levels, cohorts, groups, teacher availability) message keys.
 */
export enum AcademicsErrors {
  PROGRAM_NOT_FOUND = 'programNotFound',
  PROGRAM_NAME_ALREADY_EXISTS = 'programNameAlreadyExists',
  LEVEL_NOT_FOUND = 'levelNotFound',
  LEVEL_ORDER_ALREADY_EXISTS = 'levelOrderAlreadyExists',
  COHORT_NOT_FOUND = 'cohortNotFound',
  COURSE_NOT_FOUND_IN_ORGANIZATION = 'courseNotFoundInOrganization',
  HAS_DEPENDENTS = 'academicsHasDependents',
  GROUP_NOT_FOUND = 'groupNotFound',
  GROUP_NOT_READY = 'groupNotReady',
  GROUP_CANCELLED = 'groupCancelled',
  GROUP_DELETE_NOT_ALLOWED = 'groupDeleteNotAllowed',
  INVALID_STATUS_TRANSITION = 'invalidGroupStatusTransition',
  CANCEL_REASON_REQUIRED = 'cancelReasonRequired',
  INVALID_SCHEDULE = 'invalidGroupSchedule',
  INVALID_STUDENT_LIMITS = 'invalidStudentLimits',
  STUDENT_NOT_FOUND_IN_ORGANIZATION = 'studentNotFoundInOrganization',
  STUDENT_ALREADY_IN_GROUP = 'studentAlreadyInGroup',
  STUDENT_NOT_IN_GROUP = 'studentNotInGroup',
  GROUP_FULL = 'groupFull',
  TEACHER_NOT_FOUND_IN_ORGANIZATION = 'teacherNotFoundInOrganization',
  TEACHER_NOT_ASSIGNABLE = 'teacherNotAssignable',
  INVALID_AVAILABILITY = 'invalidTeacherAvailability',
  AVAILABILITY_CONFLICTS_WITH_GROUPS = 'availabilityConflictsWithGroups',
  NOT_AN_INSTRUCTOR = 'notAnInstructor',
  ADDITIONAL_ROLES_INVALID = 'additionalRolesInvalid',
  USER_NOT_FOUND_IN_ORGANIZATION = 'userNotFoundInOrganization',
}

export enum AcademicsSuccessMessages {
  DELETED = 'academicsDeletedSuccessfully',
}
