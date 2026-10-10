'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DonutChart } from '@/components/atoms/charts/donut-chart';
import { LineChart } from '@/components/atoms/charts/line-chart';
import { ProgressChart } from '@/components/atoms/charts/progress-chart';
import { Button } from '@/components/atoms/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/atoms/toggle-group';
import {
  AlertCircle,
  Award,
  BookOpen,
  ClipboardList,
  Clock,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import type { ReportDatePreset, ReportsFilters } from '@/lib/types/reports/reports-params.types';
import { aggregateByBucket, type ReportTimeBucket } from '@/lib/utils/reports/bucket-time-series';
import { OrganizationMemberDashboardReportsSkeleton } from './organization-member-dashboard-reports.skeleton';
import {
  DEFAULT_ORG_MEMBER_LOCAL_CHART_FILTERS,
  ORG_MEMBER_DASHBOARD_REPORTS_NAMESPACE,
  isReportContentTypeLabelKey,
  normalizeReportContentTypeKey,
  type OrganizationMemberDashboardReportsProps,
  type OrgMemberLocalChartFilters,
} from './organization-member-dashboard-reports.types';

function enrollmentAccessTypeKey(raw: string): string {
  return raw.trim().toLowerCase();
}

function chartFilterToggleClass() {
  return 'flex max-w-full flex-wrap justify-end gap-1';
}

export function OrganizationMemberDashboardReports({
  data,
  isLoading,
  isError,
  error,
  onRetry,
  filters,
  onFiltersChange,
}: OrganizationMemberDashboardReportsProps) {
  const t = useTranslations(ORG_MEMBER_DASHBOARD_REPORTS_NAMESPACE);
  const [chartFilters, setChartFilters] = useState<OrgMemberLocalChartFilters>(
    DEFAULT_ORG_MEMBER_LOCAL_CHART_FILTERS
  );

  const learningTimeLabel = useMemo(() => {
    const minutes = data?.summary.totalTimeSpentMinutes ?? 0;
    if (minutes < 60) {
      return t('summary.minutes', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return t('summary.hoursMinutes', { hours, minutes: rest });
  }, [data?.summary.totalTimeSpentMinutes, t]);

  const allAccessTypeKeys = useMemo(
    () => (data?.accessTypeDistribution ?? []).map((s) => s.key),
    [data?.accessTypeDistribution]
  );

  const accessKeysSelected = chartFilters.accessKeys ?? allAccessTypeKeys;

  const accessTypeFiltered = useMemo(() => {
    const set = new Set(accessKeysSelected);
    return (data?.accessTypeDistribution ?? []).filter((s) => set.has(s.key));
  }, [data?.accessTypeDistribution, accessKeysSelected]);

  const accessTypeDonutData = useMemo(() => {
    return accessTypeFiltered.map((s) => {
      const k = enrollmentAccessTypeKey(s.key);
      const typed = k as 'free' | 'paid_once' | 'subscription' | 'by_organization' | 'unknown';
      const hasKey = ['free', 'paid_once', 'subscription', 'by_organization', 'unknown'].includes(
        k
      );
      return {
        type: hasKey ? t(`enrollmentAccessType.${typed}`) : s.label,
        value: s.value,
      };
    });
  }, [accessTypeFiltered, t]);

  const accessTypeDonutColors = useMemo(() => {
    return accessTypeFiltered.map((_, i) => `var(--chart-${(i % 5) + 1})`);
  }, [accessTypeFiltered]);

  const accessTypeTotal = useMemo(() => {
    return accessTypeFiltered.reduce((acc, s) => acc + s.value, 0);
  }, [accessTypeFiltered]);

  const attendanceFiltered = useMemo(() => {
    const set = new Set(chartFilters.attendanceKeys);
    return (data?.attendanceDistribution ?? []).filter((d) =>
      set.has(d.key as 'attended' | 'absent' | 'late' | 'excused')
    );
  }, [data?.attendanceDistribution, chartFilters.attendanceKeys]);

  const donutData = useMemo(() => {
    return attendanceFiltered.map((d) => ({
      type: t(`attendanceLabels.${d.key as 'attended' | 'absent' | 'late' | 'excused'}`),
      value: d.value,
    }));
  }, [attendanceFiltered, t]);

  const donutColors = useMemo(() => {
    return attendanceFiltered.map((_, i) => `var(--chart-${(i % 5) + 1})`);
  }, [attendanceFiltered]);

  const totalAttendance = useMemo(() => {
    return attendanceFiltered.reduce((acc, curr) => acc + curr.value, 0);
  }, [attendanceFiltered]);

  const contentTypeFiltered = useMemo(() => {
    const dist = [...(data?.contentTypeDistribution ?? [])];
    dist.sort((a, b) => b.value - a.value);
    if (chartFilters.contentTypeMode === 'all') return dist;
    return dist.slice(0, chartFilters.contentTypeMode);
  }, [data?.contentTypeDistribution, chartFilters.contentTypeMode]);

  const contentDonutData = useMemo(() => {
    return contentTypeFiltered.map((s) => {
      const nk = normalizeReportContentTypeKey(s.key);
      const type = isReportContentTypeLabelKey(nk) ? t(`contentTypeLabels.${nk}`) : s.label;
      return { type, value: s.value };
    });
  }, [contentTypeFiltered, t]);

  const contentDonutColors = useMemo(() => {
    return contentTypeFiltered.map((_, i) => `var(--chart-${(i % 5) + 1})`);
  }, [contentTypeFiltered]);

  const contentTypeTotal = useMemo(() => {
    return contentTypeFiltered.reduce((acc, s) => acc + s.value, 0);
  }, [contentTypeFiltered]);

  const learningActivityDisplay = useMemo(() => {
    const rows = data?.learningActivityOverTime ?? [];
    if (rows.length === 0) return [];
    const daily = rows.map((row) => ({ date: row.date, value: row.contentCount }));
    const agg = aggregateByBucket(daily, chartFilters.learningBucket);
    return agg.map((p) => ({ date: p.date, contentCount: p.value }));
  }, [data?.learningActivityOverTime, chartFilters.learningBucket]);

  const quizLineDisplay = useMemo(() => {
    const raw = data?.quizScoresOverTime ?? [];
    if (raw.length === 0) return [];
    const sorted = [...raw].toSorted(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const windowed =
      chartFilters.quizWindow === 'all' ? sorted : sorted.slice(-chartFilters.quizWindow);
    return windowed.map((q) => ({
      date: q.date,
      score: q.score,
      quizName: q.quizName,
    }));
  }, [data?.quizScoresOverTime, chartFilters.quizWindow]);

  const courseProgressFiltered = useMemo(() => {
    let rows = [...(data?.courseProgress ?? [])];
    rows = rows.filter((c) => (c.progressPercentage ?? 0) >= chartFilters.courseProgressMin);
    rows.sort((a, b) => (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0));
    return rows.slice(0, chartFilters.courseProgressTop);
  }, [data?.courseProgress, chartFilters.courseProgressMin, chartFilters.courseProgressTop]);

  const progressChartData = useMemo(() => {
    const cp = courseProgressFiltered;
    return {
      labels: cp.map((c) => c.courseName),
      percentages: cp.map((c) => c.progressPercentage),
      colors: cp.map((_, i) => `var(--chart-${(i % 5) + 1})`),
    };
  }, [courseProgressFiltered]);

  const timePerCourseFiltered = useMemo(() => {
    const rows = [...(data?.timeSpentPerCourse ?? [])];
    rows.sort((a, b) => b.timeMinutes - a.timeMinutes);
    return rows.slice(0, chartFilters.timePerCourseTop);
  }, [data?.timeSpentPerCourse, chartFilters.timePerCourseTop]);

  const timePerCourseChartData = useMemo(() => {
    const rows = timePerCourseFiltered;
    const max = Math.max(...rows.map((r) => r.timeMinutes), 1);
    return {
      labels: rows.map((r) => r.courseName),
      percentages: rows.map((r) => Math.round((r.timeMinutes / max) * 1000) / 10),
      colors: rows.map((_, i) => `var(--chart-${(i % 5) + 1})`),
    };
  }, [timePerCourseFiltered]);

  const onLearningBucketChange = (value: string) => {
    if (value === 'day' || value === 'week' || value === 'month') {
      setChartFilters((f) => ({ ...f, learningBucket: value as ReportTimeBucket }));
    }
  };

  if (isLoading && !data) {
    return <OrganizationMemberDashboardReportsSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('loadError')}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span>{error instanceof Error ? error.message : t('loadError')}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => onRetry()}>
            {t('retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  const {
    summary,
    contentTypeDistribution,
    attendanceDistribution,
    quiz,
    courseProgress,
    quizScoresOverTime,
    learningActivityOverTime,
    timeSpentPerCourse,
    accessTypeDistribution,
  } = data;

  const hasLearningSource = (learningActivityOverTime?.length ?? 0) > 0;
  const hasAccessSource = (accessTypeDistribution?.length ?? 0) > 0;
  const hasCourseProgressSource = (courseProgress?.length ?? 0) > 0;
  const hasQuizSource = (quizScoresOverTime?.length ?? 0) > 0;
  const hasTimePerCourseSource = (timeSpentPerCourse?.length ?? 0) > 0;
  const hasContentSource = (contentTypeDistribution?.length ?? 0) > 0;
  const hasAttendanceSource = (attendanceDistribution?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t('filters.dateRange')}
          </span>
          <ToggleGroup
            type="single"
            value={filters.preset}
            onValueChange={(v) => {
              if (v) {
                onFiltersChange({ ...filters, preset: v as ReportDatePreset });
              }
            }}
            variant="outline"
            className="flex flex-wrap justify-start">
            <ToggleGroupItem value="7d">{t('filterPreset.7d')}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{t('filterPreset.30d')}</ToggleGroupItem>
            <ToggleGroupItem value="3m">{t('filterPreset.3m')}</ToggleGroupItem>
            <ToggleGroupItem value="1y">{t('filterPreset.1y')}</ToggleGroupItem>
            <ToggleGroupItem value="all">{t('filterPreset.all')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t('filters.access')}
          </span>
          <ToggleGroup
            type="single"
            value={filters.accessType}
            onValueChange={(v) => {
              if (v) {
                onFiltersChange({
                  ...filters,
                  accessType: v as ReportsFilters['accessType'],
                });
              }
            }}
            variant="outline"
            className="flex flex-wrap justify-start">
            <ToggleGroupItem value="all">{t('filterAccessType.all')}</ToggleGroupItem>
            <ToggleGroupItem value="free">{t('filterAccessType.free')}</ToggleGroupItem>
            <ToggleGroupItem value="paid">{t('filterAccessType.paid')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('summary.enrolled')}</CardTitle>
            <div className="bg-primary/10 rounded-full p-2">
              <BookOpen className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary.enrolledCount}</div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('summary.inProgress')}</CardTitle>
            <div className="bg-primary/10 rounded-full p-2">
              <TrendingUp className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary.inProgressCount}</div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('summary.completed')}</CardTitle>
            <div className="bg-primary/10 rounded-full p-2">
              <GraduationCap className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary.completedCoursesCount}</div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('summary.assignmentAvg')}</CardTitle>
            <div className="bg-primary/10 rounded-full p-2">
              <ClipboardList className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {summary.assignmentAvgScore === null ? '—' : `${summary.assignmentAvgScore}%`}
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('summary.avgProgress')}</CardTitle>
            <div className="bg-primary/10 rounded-full p-2">
              <TrendingUp className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {summary.averageProgressPercentage}%
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('summary.timeSpent')}</CardTitle>
            <div className="bg-primary/10 rounded-full p-2">
              <Clock className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{learningTimeLabel}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="flex h-full flex-col lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">{t('charts.learningActivity')}</CardTitle>
            <CardDescription>{t('charts.learningActivityHint')}</CardDescription>
            <CardAction>
              <div className="flex flex-col items-end gap-1">
                <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                  {t('chartFilters.timeBucket')}
                </span>
                <ToggleGroup
                  type="single"
                  value={chartFilters.learningBucket}
                  onValueChange={onLearningBucketChange}
                  variant="outline"
                  size="sm"
                  className={chartFilterToggleClass()}>
                  <ToggleGroupItem value="day">{t('chartFilters.day')}</ToggleGroupItem>
                  <ToggleGroupItem value="week">{t('chartFilters.week')}</ToggleGroupItem>
                  <ToggleGroupItem value="month">{t('chartFilters.month')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex-1">
            {hasLearningSource ? (
              learningActivityDisplay.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('charts.filterExcludesAll')}</p>
              ) : (
                <LineChart
                  data={learningActivityDisplay}
                  xField="date"
                  yField="contentCount"
                  colors={['var(--chart-1)']}
                  showLegend={false}
                />
              )
            ) : (
              <p className="text-muted-foreground text-sm">{t('charts.emptyLearningActivity')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">{t('charts.accessTypeTitle')}</CardTitle>
            {allAccessTypeKeys.length > 1 ? (
              <CardAction>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {t('chartFilters.accessSegmentsLabel')}
                  </span>
                  <ToggleGroup
                    type="multiple"
                    value={accessKeysSelected}
                    onValueChange={(v) => {
                      if (v.length > 0) {
                        setChartFilters((f) => ({ ...f, accessKeys: v }));
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className={chartFilterToggleClass()}>
                    {allAccessTypeKeys.map((key) => {
                      const k = enrollmentAccessTypeKey(key);
                      const typed = k as
                        | 'free'
                        | 'paid_once'
                        | 'subscription'
                        | 'by_organization'
                        | 'unknown';
                      const hasKey = [
                        'free',
                        'paid_once',
                        'subscription',
                        'by_organization',
                        'unknown',
                      ].includes(k);
                      const label = hasKey ? t(`enrollmentAccessType.${typed}`) : key;
                      return (
                        <ToggleGroupItem key={key} value={key} className="text-xs">
                          {label}
                        </ToggleGroupItem>
                      );
                    })}
                  </ToggleGroup>
                </div>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            {hasAccessSource ? (
              accessTypeFiltered.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('charts.filterExcludesAll')}</p>
              ) : (
                <DonutChart
                  data={accessTypeDonutData}
                  colors={accessTypeDonutColors}
                  centerTitle={t('charts.total')}
                  centerValue={accessTypeTotal}
                  showLegend
                />
              )
            ) : (
              <p className="text-muted-foreground text-sm">{t('charts.emptyAccessType')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="flex h-full flex-col lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">{t('charts.courseProgress')}</CardTitle>
            <CardAction>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {t('chartFilters.topCountLabel')}
                  </span>
                  <ToggleGroup
                    type="single"
                    value={String(chartFilters.courseProgressTop)}
                    onValueChange={(v) => {
                      if (v === '3' || v === '5' || v === '10') {
                        setChartFilters((f) => ({
                          ...f,
                          courseProgressTop: Number(v) as 3 | 5 | 10,
                        }));
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className={chartFilterToggleClass()}>
                    <ToggleGroupItem value="3">{t('chartFilters.top3')}</ToggleGroupItem>
                    <ToggleGroupItem value="5">{t('chartFilters.top5')}</ToggleGroupItem>
                    <ToggleGroupItem value="10">{t('chartFilters.top10')}</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {t('chartFilters.minProgressLabel')}
                  </span>
                  <ToggleGroup
                    type="single"
                    value={String(chartFilters.courseProgressMin)}
                    onValueChange={(v) => {
                      if (v === '0' || v === '25' || v === '50') {
                        setChartFilters((f) => ({
                          ...f,
                          courseProgressMin: Number(v) as 0 | 25 | 50,
                        }));
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className={chartFilterToggleClass()}>
                    <ToggleGroupItem value="0">{t('chartFilters.minProgress0')}</ToggleGroupItem>
                    <ToggleGroupItem value="25">{t('chartFilters.minProgress25')}</ToggleGroupItem>
                    <ToggleGroupItem value="50">{t('chartFilters.minProgress50')}</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex-1">
            {hasCourseProgressSource ? (
              courseProgressFiltered.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('charts.filterExcludesAll')}</p>
              ) : (
                <ProgressChart
                  data={progressChartData.labels}
                  percentages={progressChartData.percentages}
                  colors={progressChartData.colors}
                />
              )
            ) : (
              <p className="text-muted-foreground text-sm">{t('charts.emptyCourseProgress')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('charts.quizScoresOverTime')}</CardTitle>
              <div className="bg-primary/10 rounded-full p-2">
                <Award className="text-primary h-4 w-4" />
              </div>
            </div>
            <CardDescription className="pt-2">
              {quiz.averageQuizScore === null
                ? t('quiz.noData')
                : `${t('quiz.averageScore')}: ${quiz.averageQuizScore}%`}
            </CardDescription>
            <CardAction>
              <div className="flex flex-col items-end gap-1">
                <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                  {t('chartFilters.quizPointsLabel')}
                </span>
                <ToggleGroup
                  type="single"
                  value={
                    chartFilters.quizWindow === 'all' ? 'all' : String(chartFilters.quizWindow)
                  }
                  onValueChange={(v) => {
                    if (v === 'all') {
                      setChartFilters((f) => ({ ...f, quizWindow: 'all' }));
                    } else if (v === '5' || v === '10' || v === '20') {
                      setChartFilters((f) => ({
                        ...f,
                        quizWindow: Number(v) as 5 | 10 | 20,
                      }));
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className={chartFilterToggleClass()}>
                  <ToggleGroupItem value="5">{t('chartFilters.quiz5')}</ToggleGroupItem>
                  <ToggleGroupItem value="10">{t('chartFilters.quiz10')}</ToggleGroupItem>
                  <ToggleGroupItem value="20">{t('chartFilters.quiz20')}</ToggleGroupItem>
                  <ToggleGroupItem value="all">{t('chartFilters.quizAll')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-end">
            {hasQuizSource ? (
              quizLineDisplay.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('charts.filterExcludesAll')}</p>
              ) : (
                <LineChart
                  data={quizLineDisplay}
                  xField="date"
                  yField="score"
                  colors={['var(--chart-1)']}
                  showLegend={false}
                />
              )
            ) : (
              <p className="text-muted-foreground text-sm">{t('charts.emptyQuizScores')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle className="text-lg">{t('charts.timePerCourse')}</CardTitle>
          <CardDescription>{t('charts.timePerCourseHint')}</CardDescription>
          <CardAction>
            <div className="flex flex-col items-end gap-1">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                {t('chartFilters.topCountLabel')}
              </span>
              <ToggleGroup
                type="single"
                value={String(chartFilters.timePerCourseTop)}
                onValueChange={(v) => {
                  if (v === '3' || v === '5' || v === '10') {
                    setChartFilters((f) => ({
                      ...f,
                      timePerCourseTop: Number(v) as 3 | 5 | 10,
                    }));
                  }
                }}
                variant="outline"
                size="sm"
                className={chartFilterToggleClass()}>
                <ToggleGroupItem value="3">{t('chartFilters.top3')}</ToggleGroupItem>
                <ToggleGroupItem value="5">{t('chartFilters.top5')}</ToggleGroupItem>
                <ToggleGroupItem value="10">{t('chartFilters.top10')}</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1">
          {hasTimePerCourseSource ? (
            timePerCourseFiltered.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('charts.filterExcludesAll')}</p>
            ) : (
              <ProgressChart
                data={timePerCourseChartData.labels}
                percentages={timePerCourseChartData.percentages}
                colors={timePerCourseChartData.colors}
              />
            )
          ) : (
            <p className="text-muted-foreground text-sm">{t('charts.emptyTimePerCourse')}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-lg">{t('charts.contentTypes')}</CardTitle>
            <CardAction>
              <div className="flex flex-col items-end gap-1">
                <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                  {t('chartFilters.contentTopLabel')}
                </span>
                <ToggleGroup
                  type="single"
                  value={
                    chartFilters.contentTypeMode === 'all'
                      ? 'all'
                      : String(chartFilters.contentTypeMode)
                  }
                  onValueChange={(v) => {
                    if (v === 'all') {
                      setChartFilters((f) => ({ ...f, contentTypeMode: 'all' }));
                    } else if (v === '3' || v === '5') {
                      setChartFilters((f) => ({
                        ...f,
                        contentTypeMode: Number(v) as 3 | 5,
                      }));
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className={chartFilterToggleClass()}>
                  <ToggleGroupItem value="all">{t('chartFilters.contentAll')}</ToggleGroupItem>
                  <ToggleGroupItem value="3">{t('chartFilters.contentTop3')}</ToggleGroupItem>
                  <ToggleGroupItem value="5">{t('chartFilters.contentTop5')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            {hasContentSource ? (
              contentTypeFiltered.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('charts.filterExcludesAll')}</p>
              ) : (
                <DonutChart
                  data={contentDonutData}
                  colors={contentDonutColors}
                  centerTitle={t('charts.total')}
                  centerValue={contentTypeTotal}
                  showLegend
                />
              )
            ) : (
              <p className="text-muted-foreground text-sm">{t('charts.emptyContentTypes')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-lg">{t('charts.attendance')}</CardTitle>
            <CardAction>
              <div className="flex flex-col items-end gap-1">
                <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                  {t('chartFilters.attendanceLabel')}
                </span>
                <ToggleGroup
                  type="multiple"
                  value={chartFilters.attendanceKeys}
                  onValueChange={(v) => {
                    if (v.length > 0) {
                      setChartFilters((f) => ({
                        ...f,
                        attendanceKeys: v as ('attended' | 'absent' | 'late' | 'excused')[],
                      }));
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className={chartFilterToggleClass()}>
                  <ToggleGroupItem value="attended">
                    {t('attendanceLabels.attended')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="absent">{t('attendanceLabels.absent')}</ToggleGroupItem>
                  <ToggleGroupItem value="late">{t('attendanceLabels.late')}</ToggleGroupItem>
                  <ToggleGroupItem value="excused">{t('attendanceLabels.excused')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            {hasAttendanceSource ? (
              attendanceFiltered.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('charts.filterExcludesAll')}</p>
              ) : (
                <DonutChart
                  data={donutData}
                  colors={donutColors}
                  centerTitle={t('charts.total')}
                  centerValue={totalAttendance}
                  showLegend
                />
              )
            ) : (
              <p className="text-muted-foreground text-sm">{t('charts.emptyAttendance')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
