import type { StudentDashboardReports } from '@darnozom/shared-types';
import type { ReportsFilters } from '@/lib/types/reports/reports-params.types';
import type {
  ReportContentSliceMode,
  ReportMinProgress,
  ReportQuizWindow,
  ReportTimeBucket,
  ReportTopN,
} from '@/lib/utils/reports/report-chart-filter.types';

/** Per-chart UI filters (client-side) for student dashboard */
export interface StudentLocalChartFilters {
  learningBucket: ReportTimeBucket;
  /** When null, all access-type slices from the API are shown */
  accessKeys: string[] | null;
  courseProgressTop: ReportTopN;
  courseProgressMin: ReportMinProgress;
  quizWindow: ReportQuizWindow;
  timePerCourseTop: ReportTopN;
  contentTypeMode: ReportContentSliceMode;
  attendanceKeys: ('attended' | 'absent' | 'late' | 'excused')[];
}

export const DEFAULT_STUDENT_LOCAL_CHART_FILTERS: StudentLocalChartFilters = {
  learningBucket: 'day',
  accessKeys: null,
  courseProgressTop: 5,
  courseProgressMin: 0,
  quizWindow: 10,
  timePerCourseTop: 5,
  contentTypeMode: 'all',
  attendanceKeys: ['attended', 'absent', 'late', 'excused'],
};

export const REPORT_CONTENT_TYPE_LABEL_KEYS = [
  'article',
  'video',
  'assignment',
  'quiz',
  'project',
  'live_session',
  'attachment',
  'unknown',
] as const;

export type ReportContentTypeLabelKey = (typeof REPORT_CONTENT_TYPE_LABEL_KEYS)[number];

export function normalizeReportContentTypeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replaceAll(/[\s-]+/g, '_');
}

export function isReportContentTypeLabelKey(key: string): key is ReportContentTypeLabelKey {
  return (REPORT_CONTENT_TYPE_LABEL_KEYS as readonly string[]).includes(key);
}

export interface StudentDashboardReportsProps {
  data: StudentDashboardReports | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  filters: ReportsFilters;
  onFiltersChange: (filters: ReportsFilters) => void;
}
