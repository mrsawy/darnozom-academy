import type {
  CourseProgressReport,
  QuizScoreReport,
  ReportsPieSlice,
  StudentDashboardReportsQuiz,
} from './student-dashboard-reports.interface';

/** Daily (or finer) new-enrollment counts for one course — used to plot multi-series trends. */
export interface EnrollmentTrendSeriesPoint {
  date: string;
  courseId: string;
  courseName: string;
  count: number;
}

export interface TopCourseReport {
  courseId: string;
  courseName: string;
  enrollmentCount: number;
  completionRate: number;
  avgProgress: number;
  revenue: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

export interface OrganizationDashboardReportsSummary {
  totalEnrollments: number;
  uniqueLearners: number;
  completedEnrollments: number;
  averageProgressPercentage: number;
  totalTimeSpentMinutes: number;
  activeLearnersCount: number;
  completionRate: number;
  totalRevenue: number;
  freeEnrollments: number;
  paidEnrollments: number;
}

/**
 * Aggregated metrics for the authenticated organization's dashboard (NATS `reports.organizationDashboard`).
 */
export interface OrganizationDashboardReports {
  summary: OrganizationDashboardReportsSummary;
  contentTypeDistribution: ReportsPieSlice[];
  attendanceDistribution: ReportsPieSlice[];
  quiz: StudentDashboardReportsQuiz;
  courseProgress: CourseProgressReport[];
  quizScoresOverTime: QuizScoreReport[];
  enrollmentTrends: EnrollmentTrendSeriesPoint[];
  topCourses: TopCourseReport[];
  revenueOverTime: RevenueTrendPoint[];
  accessTypeDistribution: ReportsPieSlice[];
}
