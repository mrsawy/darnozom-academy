/**
 * Course-related error and success message keys. Use as translation keys on backend and frontend.
 */
export enum CourseErrors {
  COURSE_NOT_FOUND = 'courseNotFound',
  ORGANIZATION_CONTEXT_REQUIRED = 'organizationContextRequired',
  COURSE_PRICE_NOT_AVAILABLE = 'coursePriceNotAvailable',
  COURSE_NOT_STANDALONE = 'courseNotStandalone',
}

export enum CourseSuccessMessages {
  COURSE_UPDATED = 'courseUpdatedSuccessfully',
  COURSE_DELETED = 'courseDeletedSuccessfully',
  PUBLISH_STATUS_UPDATED = 'publishStatusUpdatedSuccessfully',
  CONTENT_CREATED = 'courseContentCreatedSuccessfully',
  PROJECT_GRADED = 'projectGradedSuccessfully',
}
