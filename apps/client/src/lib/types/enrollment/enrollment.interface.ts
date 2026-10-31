import { AccessType } from '@darnozom/shared-types';
import { ICourse } from '../course/course.interface';
import { BillingCycle } from '../course/enum/BillingCycle.enum';
import { IUser } from '../user/user.interface';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}
export interface SubscriptionTypeDef {
  reminder_days?: number;
  status: SubscriptionStatus; // assuming "state" refers to subscription status
  starts_at: Date | string;
  next_billing?: Date | string;
  reminder_date?: Date | string;
  ends_at?: Date | string;
  resumed_at?: Date;
  suspended_at?: Date;
  reactivated_at?: Date;
  transaction_id?: string;
  billing: {
    email: string;
    last_name: string;
    first_name: string;
    phone_number?: string;
    amount: number;
    currency: string;
    billingCycle: BillingCycle;
  };

  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Per-content progress: time tracking, first/last access, completion, video resume */
export interface IContentProgressItem {
  contentId: string;
  contentTitle?: string;
  contentType?: string;
  timeSpentMinutes: number;
  firstAccessedAt: Date | string;
  lastAccessedAt: Date | string;
  completedAt: Date | string | null;
  videoLastPositionSeconds: number;
  accessCount: number;
}

export interface IEnrollmentProgress {
  completedModules: string[];
  completedContents: string[];
  /** Detailed per-content time tracking and resume data */
  contentTimeTracking?: IContentProgressItem[];
  quizScores?: {
    quizId: string;
    score: number;
    attempts: number;
    completedAt: Date;
  }[];
}

export interface IEnrollment {
  _id?: string;

  userId: string;
  user?: IUser;
  courseId: string;
  course?: ICourse;
  organizationId: string;

  enrolledAt: Date;
  completedAt?: Date;

  accessType: AccessType;

  /** PENDING_PAYMENT = manual-transfer payment awaiting organization review. Missing = ACTIVE. */
  status?: 'ACTIVE' | 'PENDING_PAYMENT';

  subscription?: SubscriptionTypeDef;

  progressPercentage: number;
  timeSpentMinutes: number;
  lastAccessedAt: Date;

  progress: IEnrollmentProgress;

  certificate: {
    issued: boolean;
    issuedAt?: Date;
    certificateUrl?: string;
  };

  createdAt?: Date;
  updatedAt?: Date;
}
