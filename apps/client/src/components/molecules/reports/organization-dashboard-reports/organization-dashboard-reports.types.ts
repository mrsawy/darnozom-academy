import type { OrganizationDashboardReports } from '@lms-organization/shared-types';
import type { ReportsFilters } from '@/lib/types/reports/reports-params.types';
import type {
  ReportContentSliceMode,
  ReportMinProgress,
  ReportQuizWindow,
  ReportTimeBucket,
  ReportTopN,
} from '@/lib/utils/reports/report-chart-filter.types';

export type {
  ReportContentSliceMode,
  ReportMinProgress,
  ReportQuizWindow,
  ReportTimeBucket,
  ReportTopN,
} from '@/lib/utils/reports/report-chart-filter.types';

/** Per-chart UI filters (client-side) for organization / instructor dashboards */
export interface OrganizationLocalChartFilters {
  enrollmentBucket: ReportTimeBucket;
  revenueBucket: ReportTimeBucket;
  accessKeys: ('free' | 'paid')[];
  courseProgressTop: ReportTopN;
  courseProgressMin: ReportMinProgress;
  quizWindow: ReportQuizWindow;
  topCoursesTop: ReportTopN;
  contentTypeMode: ReportContentSliceMode;
  attendanceKeys: ('attended' | 'absent' | 'late' | 'excused')[];
}

export const DEFAULT_ORGANIZATION_LOCAL_CHART_FILTERS: OrganizationLocalChartFilters = {
  enrollmentBucket: 'day',
  revenueBucket: 'day',
  accessKeys: ['free', 'paid'],
  courseProgressTop: 5,
  courseProgressMin: 0,
  quizWindow: 10,
  topCoursesTop: 5,
  contentTypeMode: 'all',
  attendanceKeys: ['attended', 'absent', 'late', 'excused'],
};

/** next-intl namespace for organization admin dashboard reports */
export const ORG_DASHBOARD_REPORTS_NAMESPACE = 'OrganizationDashboard.reports' as const;

/** next-intl namespace for instructor-scoped reports (same keys as admin reports) */
export const ORG_INSTRUCTOR_REPORTS_NAMESPACE = 'OrganizationDashboard.instructorReports' as const;

export type OrganizationReportsTranslationNamespace =
  | typeof ORG_DASHBOARD_REPORTS_NAMESPACE
  | typeof ORG_INSTRUCTOR_REPORTS_NAMESPACE;

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

export interface OrganizationDashboardReportsProps {
  data: OrganizationDashboardReports | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  filters: ReportsFilters;
  onFiltersChange: (filters: ReportsFilters) => void;
  /** Defaults to {@link ORG_DASHBOARD_REPORTS_NAMESPACE} */
  reportsTranslationNamespace?: OrganizationReportsTranslationNamespace;
}
