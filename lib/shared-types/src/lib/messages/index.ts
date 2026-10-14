/**
 * Shared error message enums for backend and frontend.
 * Use enum values as translation keys (e.g. t(`Errors.${CommonErrors.SOMETHING_WENT_WRONG}`)).
 */
export * from './common-errors.enum';
export * from './category-errors.enum';
export * from './auth-errors.enum';
export * from './auth-token-error.util';
export * from './user-errors.enum';
export * from './validation-errors.enum';
export * from './course.enum';
export * from './course-errors.enum';
export * from './enrollment-errors.enum';
export * from './page-errors.enum';
export * from './review-errors.enum';
export * from './subscription-errors.enum';
export * from './subscription-limit-errors.enum';
export * from './file-errors.enum';
export * from './verification-messages.enum';
export * from './parent-errors.enum';
export * from './withdrawal-errors.enum';
export * from './wallet-errors.enum';
export * from './private-session-errors.enum';
export * from './role-errors.enum';
export * from './ai-subscription-errors.enum';
export * from './ai-attachment-errors.enum';
export * from './organization-errors.enum';
export * from './grade-errors.enum';
export * from './school-type-errors.enum';
export * from './admin-review-errors.enum';
export * from './payment-errors.enum';
export * from './academics-errors.enum';
export * from './sharia-errors.enum';

import { CommonErrors } from './common-errors.enum';
import { CategoryErrors } from './category-errors.enum';
import { AuthErrors, AuthSuccessMessages } from './auth-errors.enum';
import { UserErrors, UserSuccessMessages } from './user-errors.enum';
import { ValidationErrors } from './validation-errors.enum';
import { CourseMessages } from './course.enum';
import { CourseErrors, CourseSuccessMessages } from './course-errors.enum';
import { EnrollmentErrors, EnrollmentSuccessMessages } from './enrollment-errors.enum';
import { PageErrors } from './page-errors.enum';
import { ReviewErrors } from './review-errors.enum';
import { SubscriptionSuccessMessages } from './subscription-errors.enum';
import { SubscriptionLimitErrors } from './subscription-limit-errors.enum';
import { FileSuccessMessages } from './file-errors.enum';
import { VerificationErrors, VerificationSuccessMessages } from './verification-messages.enum';
import { ParentErrors, ParentSuccessMessages } from './parent-errors.enum';
import { WithdrawalRequestErrors } from './withdrawal-errors.enum';
import { WalletErrors } from './wallet-errors.enum';
import { PrivateSessionErrors, PrivateSessionSuccessMessages } from './private-session-errors.enum';
import { RoleErrors, RoleSuccessMessages } from './role-errors.enum';
import { AiSubscriptionErrors } from './ai-subscription-errors.enum';
import { AiAttachmentErrors } from './ai-attachment-errors.enum';
import { OrganizationErrors, OrganizationSuccessMessages } from './organization-errors.enum';
import { GradeErrors, GradeSuccessMessages } from './grade-errors.enum';
import { SchoolTypeErrors, SchoolTypeSuccessMessages } from './school-type-errors.enum';
import { AdminReviewErrors, AdminReviewSuccessMessages } from './admin-review-errors.enum';
import { PaymentErrors } from './payment-errors.enum';
import { AcademicsErrors, AcademicsSuccessMessages } from './academics-errors.enum';

export const ALL_ERROR_KEYS: readonly string[] = [
  ...Object.values(CommonErrors),
  ...Object.values(CategoryErrors),
  ...Object.values(AuthErrors),
  ...Object.values(AuthSuccessMessages),
  ...Object.values(UserErrors),
  ...Object.values(UserSuccessMessages),
  ...Object.values(ValidationErrors),
  ...Object.values(CourseMessages),
  ...Object.values(CourseErrors),
  ...Object.values(CourseSuccessMessages),
  ...Object.values(EnrollmentErrors),
  ...Object.values(EnrollmentSuccessMessages),
  ...Object.values(PageErrors),
  ...Object.values(ReviewErrors),
  ...Object.values(SubscriptionSuccessMessages),
  ...Object.values(SubscriptionLimitErrors),
  ...Object.values(FileSuccessMessages),
  ...Object.values(VerificationErrors),
  ...Object.values(VerificationSuccessMessages),
  ...Object.values(ParentErrors),
  ...Object.values(ParentSuccessMessages),
  ...Object.values(WithdrawalRequestErrors),
  ...Object.values(WalletErrors),
  ...Object.values(PrivateSessionErrors),
  ...Object.values(PrivateSessionSuccessMessages),
  ...Object.values(RoleErrors),
  ...Object.values(RoleSuccessMessages),
  ...Object.values(AiSubscriptionErrors),
  ...Object.values(AiAttachmentErrors),
  ...Object.values(OrganizationErrors),
  ...Object.values(OrganizationSuccessMessages),
  ...Object.values(GradeErrors),
  ...Object.values(GradeSuccessMessages),
  ...Object.values(SchoolTypeErrors),
  ...Object.values(SchoolTypeSuccessMessages),
  ...Object.values(AdminReviewErrors),
  ...Object.values(AdminReviewSuccessMessages),
  ...Object.values(PaymentErrors),
  ...Object.values(AcademicsErrors),
  ...Object.values(AcademicsSuccessMessages),
] as const;

export const ALL_ERROR_KEYS_SET = new Set(ALL_ERROR_KEYS);