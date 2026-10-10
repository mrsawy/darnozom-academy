export interface IStudentProgressEnrollment {
  enrollmentId: string;
  courseId: string;
  courseTitle?: string;
  progressPercentage: number;
  timeSpentMinutes: number;
  enrolledAt?: string;
  completedAt?: string;
  lastAccessedAt?: string;
}

export interface IStudentProgressSummary {
  totalEnrollments: number;
  completedEnrollments: number;
  averageProgressPercentage: number;
  totalTimeSpentMinutes: number;
  lastAccessedAt: string | null;
}

export interface IRelatedStudentProgress {
  student: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username: string;
    email: string;
    phone: string;
  };
  summary: IStudentProgressSummary;
  enrollments: IStudentProgressEnrollment[];
}

export interface IParentProgressFilters {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface IParentEnrollmentContent {
  _id: string;
  title: string;
  description?: string;
  type: string;
}

export interface IParentEnrollmentModule {
  _id: string;
  title: string;
  description?: string;
  learningObjectives?: string[];
  contents: IParentEnrollmentContent[];
}

export interface IRelatedStudentEnrollmentDetails {
  student: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username: string;
    email: string;
    phone: string;
  };
  enrollment: {
    _id: string;
    courseId: string;
    accessType: string;
    enrolledAt: string;
    completedAt?: string;
    progressPercentage: number;
    timeSpentMinutes: number;
    lastAccessedAt?: string;
    subscription?: {
      status?: string;
      starts_at?: string;
      ends_at?: string;
      next_billing?: string;
      billing?: {
        amount?: number;
        currency?: string;
        billingCycle?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        phone_number?: string;
      };
    };
    certificate?: {
      issued?: boolean;
      issuedAt?: string;
      certificateUrl?: string;
    };
    progress?: {
      completedModules?: string[];
      completedContents?: string[];
      contentTimeTracking?: {
        contentId: string;
        contentTitle?: string;
        contentType?: string;
        timeSpentMinutes: number;
        firstAccessedAt?: string;
        lastAccessedAt?: string;
        completedAt?: string | null;
        videoLastPositionSeconds?: number;
        accessCount?: number;
      }[];
    };
  };
  course: {
    _id: string;
    name: string;
    description?: string;
    shortDescription?: string;
    learningObjectives?: string[];
    modules: IParentEnrollmentModule[];
  };
  summary: {
    totalModules: number;
    totalContents: number;
    completedModules: number;
    completedContents: number;
  };
}
