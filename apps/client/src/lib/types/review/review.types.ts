export enum ReviewType {
  COURSE = 'COURSE',
  INSTRUCTOR = 'INSTRUCTOR',
  ORGANIZATION = 'ORGANIZATION',
  MODULE = 'MODULE',
  CONTENT = 'CONTENT',
}

/** Current user's review embedded on course / module / content from enrollment APIs. */
export interface IUserReview {
  _id: string;
  rating: number;
  comment?: string;
}

export interface CreateReviewInput {
  reviewType: ReviewType;
  rating: number;
  comment?: string;
  courseId?: string;
  moduleId?: string;
  contentId?: string;
  instructorId?: string;
  reviewedOrganizationId?: string;
  userId?: string;
}

/** Public course reviews list (user populated by API). */
export interface CourseReviewListUser {
  _id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface CourseReviewListItem {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user?: CourseReviewListUser;
}
