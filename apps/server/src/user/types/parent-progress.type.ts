import mongoose from 'mongoose';

/** Optional filters for parent progress endpoints (date range = enrolledAt/lastAccessedAt; search = course title) */
export interface ParentProgressFilters {
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  search?: string; // course title or student name
}

export interface StudentProgressEnrollment {
  enrollmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  courseTitle?: string;
  progressPercentage: number;
  timeSpentMinutes: number;
  enrolledAt?: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
}

export interface StudentProgressSummary {
  totalEnrollments: number;
  completedEnrollments: number;
  averageProgressPercentage: number;
  totalTimeSpentMinutes: number;
  lastAccessedAt: Date | null;
}

export interface RelatedStudentProgress {
  student: {
    _id: mongoose.Types.ObjectId;
    firstName?: string;
    lastName?: string;
    username: string;
    email: string;
    phone: string;
  };
  summary: StudentProgressSummary;
  enrollments: StudentProgressEnrollment[];
}

export interface ParentEnrollmentCourseContent {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: string;
}

export interface ParentEnrollmentCourseModule {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  learningObjectives?: string[];
  contents: ParentEnrollmentCourseContent[];
}

export interface ParentEnrollmentCourseDetails {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  shortDescription?: string;
  learningObjectives?: string[];
  modules: ParentEnrollmentCourseModule[];
}

export interface ParentEnrollmentProgressSummary {
  totalModules: number;
  totalContents: number;
  completedModules: number;
  completedContents: number;
}

export interface RelatedStudentEnrollmentDetails {
  student: {
    _id: mongoose.Types.ObjectId;
    firstName?: string;
    lastName?: string;
    username: string;
    email: string;
    phone: string;
  };
  enrollment: {
    _id: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    accessType: string;
    enrolledAt: Date;
    completedAt?: Date;
    progressPercentage: number;
    timeSpentMinutes: number;
    lastAccessedAt?: Date;
    subscription?: unknown;
    certificate?: {
      issued?: boolean;
      issuedAt?: Date;
      certificateUrl?: string;
    };
    progress?: {
      completedModules?: mongoose.Types.ObjectId[];
      completedContents?: mongoose.Types.ObjectId[];
      contentTimeTracking?: {
        contentId: mongoose.Types.ObjectId;
        contentTitle?: string;
        contentType?: string;
        timeSpentMinutes: number;
        firstAccessedAt?: Date;
        lastAccessedAt?: Date;
        completedAt?: Date | null;
        videoLastPositionSeconds?: number;
        accessCount?: number;
      }[];
    };
  };
  course: ParentEnrollmentCourseDetails;
  summary: ParentEnrollmentProgressSummary;
}
