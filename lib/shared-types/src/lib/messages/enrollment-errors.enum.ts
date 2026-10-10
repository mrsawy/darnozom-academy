/**
 * Enrollment-related error message keys. Use as translation keys on backend and frontend.
 */
export enum EnrollmentErrors {
  ENROLLMENT_NOT_FOUND = 'enrollmentNotFound',
  ENROLLMENT_EXPIRED = 'enrollmentExpired',
  MUST_BE_STUDENT_TO_ENROLL = 'mustBeStudentToEnroll',
}

/**
 * Enrollment-related success message keys. Use as translation keys on backend and frontend.
 */
export enum EnrollmentSuccessMessages {
  QUIZ_SUBMITTED = 'quizSubmittedSuccessfully',
  PROJECT_SUBMITTED = 'projectSubmittedSuccessfully',
  ATTENDANCE_MARKED = 'attendanceMarkedSuccessfully',
  ASSIGNMENT_SUBMITTED = 'assignmentSubmittedSuccessfully',
  ASSIGNMENT_GRADED = 'assignmentGradedSuccessfully',
}
