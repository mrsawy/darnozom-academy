import type { PricingSchema } from '@/lib/types/course/course.interface';
import type { Question } from '@/lib/types/course/content.interface';
import type { VideoType } from '@/lib/types/course/enum/VideoType.enum';
import type {
  ActiveStatusType,
  ApprovalStatusType,
  PublishStatusType,
  EntityStatusType,
} from '@lms-organization/shared-types';

// Re-export from shared-types so every consumer can import from either location.
// ApprovalStatus keeps its original name for backward-compat with existing client imports.

export interface IDashboardStats {
  pendingCategories: number;
  pendingCourses: number;
  pendingModules: number;
  pendingContents: number;
  totalOrganizations: number;
  totalUsers: number;
}

export interface IReviewableItem {
  _id: string;
  approvalStatus: ApprovalStatusType;
  approvalComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  pendingUpdate?: Record<string, unknown> | null;
  publishStatus?: PublishStatusType;
  publishedAt?: string | null;
  activeStatus?: ActiveStatusType;
  status?: EntityStatusType;
  createdAt: string;
  updatedAt: string;
}

export interface IReviewableCategory extends IReviewableItem {
  name: string;
  description?: string;
  parentId?: string | null;
  organizationId: string;
  organization?: { _id: string; name: string };
}

export interface IReviewablePerson {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface IReviewableCourse extends IReviewableItem {
  name: string;
  description?: string;
  shortDescription?: string;
  organizationId: string;
  createdBy: string;
  isPaid: boolean;
  pricing?: PricingSchema;
  settings?: Record<string, unknown>;
  attendanceSettings?: Record<string, unknown>;
  learningObjectives?: string[];
  thumbnailKey?: string;
  trailerKey?: string;
  organization?: { _id: string; name: string };
  instructor?: IReviewablePerson;
  coInstructors?: IReviewablePerson[];
  categories?: { _id: string; name: string }[];
  grade?: { _id: string; nameEn: string; nameAr: string } | null;
  schoolTypes?: { _id: string; nameEn: string; nameAr: string }[];
  /** @deprecated legacy read compat */
  schoolType?: { _id: string; nameEn: string; nameAr: string } | null;
}

export interface IReviewableModule extends IReviewableItem {
  title: string;
  description?: string;
  courseId: string;
  organizationId: string;
  createdBy: string;
  organization?: { _id: string; name: string };
  course?: { _id: string; name: string };
}

export interface IReviewableContent extends IReviewableItem {
  title: string;
  description?: string;
  type: string;
  courseId: string;
  moduleId: string;
  organizationId: string;
  createdBy: string;
  organization?: { _id: string; name: string };
  course?: { _id: string; name: string };
  module?: { _id: string; title: string };

  /** Type-specific fields returned with pending content (discriminators). */
  questions?: Question[];
  quizDurationInMinutes?: number;
  quizStartDate?: string;
  quizEndDate?: string;
  maxAttempts?: number;
  dueDate?: string | Date;
  maxPoints?: number;
  instructions?: string;
  content?: string;
  fileKey?: string;
  fileUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  videoType?: VideoType;
  videoUrl?: string;
  body?: string;
  summary?: string;
  authorization?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  meetingUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  platform?: string;
  recordingUrl?: string;
  recordedSession?: string;
  durationInMinutes?: number;
  requirements?: string;
  deliverables?: string[];
  isGroupProject?: boolean;
  maxGroupSize?: number;
}

export interface IAdminOrganization {
  _id: string;
  name: string;
  slug: string;
  planName?: string;
  subscriptionStatus?: string | null;
  status?: EntityStatusType;
  stats?: {
    totalCourses: number;
    totalEnrollments: number;
    totalReviews: number;
    averageRating: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IAdminPlanSummary {
  _id: string;
  name: string;
  tier?: string;
  features?: Record<string, unknown>;
  isActive?: boolean;
}

export interface IAdminSubscriptionSummary {
  _id: string;
  status: string;
  billingCycle: string;
  startsAt: string;
  endsAt?: string | null;
  nextBillingAt?: string | null;
  usage?: {
    usersUsed: number;
    coursesUsed: number;
    pagesUsed: number;
    parentUsersUsed: number;
    storageUsedGB: number;
    liveSessionsUsed: number;
    assignmentsUsed: number;
  };
}

export interface IAdminOrganizationDetails extends IAdminOrganization {
  usersCount: number;
  coursesCount: number;
  plan?: IAdminPlanSummary | null;
  subscription?: IAdminSubscriptionSummary | null;
}

export interface IAdminUser {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  status: string;
  createdAt: string;
}

export interface IAdminCourse {
  _id: string;
  name: string;
  description?: string;
  isPaid: boolean;
  approvalStatus: ApprovalStatusType;
  publishStatus?: PublishStatusType;
  publishedAt?: string | null;
  status?: EntityStatusType;
  organizationId: string;
  instructor?: { _id: string; firstName: string; lastName: string; username: string };
  categories?: { _id: string; name: string }[];
  createdAt: string;
}

export interface IAdminModule {
  _id: string;
  title: string;
  description?: string;
  courseId: string;
  organizationId: string;
  approvalStatus: ApprovalStatusType;
  publishStatus?: PublishStatusType;
  activeStatus?: ActiveStatusType;
  status?: EntityStatusType;
  createdAt: string;
}

export interface IAdminContent {
  _id: string;
  title: string;
  description?: string;
  type: string;
  approvalStatus: ApprovalStatusType;
  activeStatus?: ActiveStatusType;
  status?: EntityStatusType;
  organizationId: string;
  courseId?: { _id: string; name: string } | string;
  moduleId?: { _id: string; title: string } | string;
  createdAt: string;
}

export interface IAdminEnrollment {
  _id: string;
  userId?:
    | { _id: string; firstName: string; lastName: string; email: string; username: string }
    | string;
  courseId?: { _id: string; name: string } | string;
  organizationId: string;
  accessType: string;
  progressPercentage: number;
  enrolledAt: string;
  completedAt?: string;
}

export interface IReviewAction {
  itemId: string;
  comment?: string;
  deleteFiles?: boolean;
}

export interface IBulkActionResult {
  succeeded: number;
  failed: { itemId: string; error: string }[];
}

export interface IBulkReviewAction {
  itemIds: string[];
  comment?: string;
  deleteFiles?: boolean;
}

export interface ISuspendAction {
  entityId: string;
  reason?: string;
}

export {
  type ApprovalStatusType as ApprovalStatus,
  type EntityStatusType,
  type PublishStatusType,
} from '@lms-organization/shared-types';
