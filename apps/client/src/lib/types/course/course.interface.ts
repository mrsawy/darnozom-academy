import { BillingCycle } from './enum/BillingCycle.enum';
import { Currency, PublishStatus } from '@darnozom/shared-types';
import { IModule, IModuleWithContents } from './modules.interface';
import { ICategory } from '../category/ICategory';
import { IInstructor, IUser } from '../user/user.interface';
import type { IUserReview } from '../review/review.types';
import type { ApprovalStatusType as ApprovalStatus } from '@darnozom/shared-types';

// ----- Subdocuments -----

export interface PricingDetails {
  originalPrice: number; // Typo in schema? Should be originalPrice?
  originalCurrency: Currency; // EGP, USD, etc.
  priceUSD: number;
  discountEndDate?: Date;
  discountStartDate?: Date;
  discountPercentage?: number; // 0-100
}

export interface PricingSchema {
  [BillingCycle.MONTHLY]?: PricingDetails;
  [BillingCycle.YEARLY]?: PricingDetails;
  [BillingCycle.ONE_TIME]?: PricingDetails;
}

export interface SettingsSchema {
  isPublished: boolean;
  isDraft: boolean;
  enrollmentLimit?: number;
  enrollmentDeadline?: Date;
  certificateEnabled: boolean;
  downloadEnabled: boolean;
}

export interface StatsSchema {
  totalEnrollments: number;
  totalReviews: number;
  averageRating: number;
  totalViews: number;
  completionRate: number;
  enrolledStudentsCount: number;
}

export interface TimeSlot {
  _id?: string;
  startTime: string; // Format: HH:MM am/pm (e.g., 02:00 pm)
  endTime: string; // Format: HH:MM am/pm (e.g., 11:30 am)
  dayOfWeek: string; // e.g., Monday, Tuesday, etc.
  moduleId?: string;
  moduleName?: string;
  instructorsIds?: string[];
  coInstructorsIds?: string[];
  studentsIds?: string[];
  deletedAt?: string | null;
}

export interface AttendanceSettings {
  requireAttendance?: boolean;
  offlineSchedule?: TimeSlot[];
}

/** Localized lookup shape for the independent Grade / SchoolType relations. */
export interface ILocalizedLookup {
  _id: string;
  nameEn: string;
  nameAr: string;
}

// ----- Main Course Interface -----

export interface ICourse {
  _id: string;
  organizationId: string;

  name: string;

  createdBy: string; // username (refPath)
  instructorId?: string;
  coInstructorsIds?: string[];
  coInstructors?: IUser[];
  categoriesIds?: string[];
  categories?: ICategory[];
  gradeId?: string | null;
  grade?: ILocalizedLookup | null;
  schoolTypeIds?: string[];
  schoolTypes?: ILocalizedLookup[];
  /** @deprecated legacy read compat */
  schoolTypeId?: string | null;
  /** @deprecated legacy read compat */
  schoolType?: ILocalizedLookup | null;
  modulesIds?: string[];

  isPaid: boolean;

  description?: string;
  shortDescription?: string;

  thumbnailKey?: string;
  trailerKey?: string;

  pricing: PricingSchema;
  settings?: SettingsSchema;
  stats?: StatsSchema;
  attendanceSettings?: AttendanceSettings;

  paypalPlanId?: string;

  createdAt: string;
  updatedAt: string;

  instructor?: IInstructor;

  learningObjectives: string[];

  duration?: string;
  language?: string;
  thumbnailUrl?: string;
  trailerUrl?: string;

  approvalStatus?: ApprovalStatus;
  approvalComment?: string;
  pendingUpdate?: Record<string, unknown> | null;

  publishStatus?: PublishStatus;
  publishedAt?: string | null;

  /** Current user's review for this course (when loaded in enrollment context). */
  userReview?: IUserReview | null;
}

export interface ICourseWithModules extends ICourse {
  modules: IModule[];
}

export interface ICourseOverview extends ICourse {
  modules: IModuleWithContents[];
}
// export interface ICourseWithContents

export { PublishStatus } from '@darnozom/shared-types';
