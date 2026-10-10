/**
 * Single slice for pie charts (learning activity, attendance, etc.).
 */
export interface ReportsPieSlice {
  key: string;
  label: string;
  value: number;
}

export interface TimeSpentPerCourse {
  courseName: string;
  timeMinutes: number;
}

export interface LearningActivityPoint {
  date: string;
  contentCount: number;
}

export interface StudentDashboardReportsSummary {
  enrolledCount: number;
  completedCoursesCount: number;
  averageProgressPercentage: number;
  totalTimeSpentMinutes: number;
  inProgressCount: number;
  assignmentAvgScore: number | null;
}

export interface StudentDashboardReportsQuiz {
  averageQuizScore: number | null;
  quizAttemptsCount: number;
}

export interface CourseProgressReport {
  courseName: string;
  progressPercentage: number;
}

export interface QuizScoreReport {
  date: string;
  score: number;
  quizName: string;
}

/**
 * Aggregated metrics for the authenticated student's dashboard (NATS `reports.studentDashboard`).
 */
export interface StudentDashboardReports {
  summary: StudentDashboardReportsSummary;
  contentTypeDistribution: ReportsPieSlice[];
  attendanceDistribution: ReportsPieSlice[];
  quiz: StudentDashboardReportsQuiz;
  courseProgress: CourseProgressReport[];
  quizScoresOverTime: QuizScoreReport[];
  timeSpentPerCourse: TimeSpentPerCourse[];
  learningActivityOverTime: LearningActivityPoint[];
  accessTypeDistribution: ReportsPieSlice[];
}
