'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Progress } from '@/components/atoms/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { getSingleRelatedStudentProgress } from '@/lib/actions/parent/parent-progress.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import type {
  IRelatedStudentProgress,
  IStudentProgressEnrollment,
  IParentProgressFilters,
} from '@/lib/types/parent/parent-progress.interface';
import { BookOpen, Calendar, Search, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';

interface ParentDashboardViewProps {
  initialChildrenProgress: IRelatedStudentProgress[];
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function isValidEnrollmentId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export function ParentDashboardView({ initialChildrenProgress }: ParentDashboardViewProps) {
  const t = useTranslations('ParentDashboard');
  const router = useRouter();
  const [childrenProgress] = useState<IRelatedStudentProgress[]>(initialChildrenProgress);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    initialChildrenProgress[0]?.student._id ?? null
  );
  const [filters, setFilters] = useState<IParentProgressFilters>({
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [childData, setChildData] = useState<IRelatedStudentProgress | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedChild = childrenProgress.find((c) => c.student._id === selectedStudentId);

  const loadChildProgress = useCallback(async () => {
    if (!selectedStudentId) {
      setChildData(selectedChild ?? null);
      return;
    }
    setLoading(true);
    try {
      const applied: IParentProgressFilters = {};
      if (filters.dateFrom) applied.dateFrom = filters.dateFrom;
      if (filters.dateTo) applied.dateTo = filters.dateTo;
      if (filters.search?.trim()) applied.search = filters.search.trim();
      const data = await getSingleRelatedStudentProgress(
        selectedStudentId,
        Object.keys(applied).length > 0 ? applied : undefined
      );
      if (isNatsErrResult(data)) {
        setChildData(null);
        return;
      }
      setChildData(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load child progress:', err);
      setChildData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, filters.dateFrom, filters.dateTo, filters.search, selectedChild]);

  const loadChildProgressRef = useRef(loadChildProgress);
  loadChildProgressRef.current = loadChildProgress;

  useEffect(() => {
    if (!selectedStudentId) {
      setChildData(selectedChild ?? null);
      return;
    }
    void loadChildProgressRef.current();
  }, [selectedStudentId, selectedChild]);

  const handleFilterChange = (key: keyof IParentProgressFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFiltersNow = () => {
    void loadChildProgress();
  };

  const enrollments: IStudentProgressEnrollment[] = childData?.enrollments ?? [];
  const summary = childData?.summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Children list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t('selectChild')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {childrenProgress.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="text-muted-foreground mb-2 h-12 w-12" />
                <p className="text-muted-foreground text-center text-sm">{t('noChildren')}</p>
              </CardContent>
            </Card>
          ) : (
            childrenProgress.map((item) => {
              const isSelected = item.student._id === selectedStudentId;
              const name =
                [item.student.firstName, item.student.lastName].filter(Boolean).join(' ') ||
                item.student.username;
              return (
                <Card
                  key={item.student._id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isSelected && 'ring-primary ring-2'
                  )}
                  onClick={() => setSelectedStudentId(item.student._id)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      {name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground text-xs">{item.student.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span>
                        {item.summary.totalEnrollments} {t('courses')}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span>
                        {item.summary.averageProgressPercentage}% {t('avgProgress')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Selected child: filters + progress table */}
      {selectedStudentId && selectedChild ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {t('progressFor')}{' '}
            {[selectedChild.student.firstName, selectedChild.student.lastName]
              .filter(Boolean)
              .join(' ') || selectedChild.student.username}
          </h2>

          {/* Date & search filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4" />
                    {t('filters.dateFrom')}
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full sm:w-40"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4" />
                    {t('filters.dateTo')}
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full sm:w-40"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <label className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Search className="h-4 w-4" />
                    {t('filters.search')}
                  </label>
                  <Input
                    placeholder={t('filters.searchPlaceholder')}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full sm:max-w-xs"
                  />
                </div>
                <Button onClick={applyFiltersNow} disabled={loading} variant="secondary">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('filters.apply')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary cards */}
          {summary ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen className="h-4 w-4" />
                    {t('summary.enrollments')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.totalEnrollments}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('summary.completed')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.completedEnrollments}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('summary.avgProgress')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.averageProgressPercentage}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('summary.timeSpent')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatDuration(summary.totalTimeSpentMinutes)}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Enrollments table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('coursesTable')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : enrollments.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <BookOpen className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p>{t('noEnrollments')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.course')}</TableHead>
                      <TableHead className="text-right">{t('table.progress')}</TableHead>
                      <TableHead className="text-right">{t('table.timeSpent')}</TableHead>
                      <TableHead>{t('table.enrolledAt')}</TableHead>
                      <TableHead>{t('table.lastAccessed')}</TableHead>
                      <TableHead>{t('table.completedAt')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e) => {
                      const enrollmentId = String(e.enrollmentId ?? '');
                      const canNavigate = isValidEnrollmentId(enrollmentId);
                      return (
                        <TableRow
                          key={enrollmentId}
                          className={cn(
                            'cursor-pointer',
                            !canNavigate && 'cursor-not-allowed opacity-70'
                          )}
                          onClick={() => {
                            if (!canNavigate) return;
                            router.push(`/parent-dashboard/enrollment/${enrollmentId}`);
                          }}
                          onKeyDown={(event) => {
                            if (!canNavigate) return;
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              router.push(`/parent-dashboard/enrollment/${enrollmentId}`);
                            }
                          }}
                          role="button"
                          tabIndex={canNavigate ? 0 : -1}
                          aria-disabled={!canNavigate}>
                          <TableCell className="font-medium">{e.courseTitle ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={e.progressPercentage} className="h-2 w-16" />
                              <span>{e.progressPercentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatDuration(e.timeSpentMinutes)}
                          </TableCell>
                          <TableCell>{formatDate(e.enrolledAt)}</TableCell>
                          <TableCell>{formatDate(e.lastAccessedAt)}</TableCell>
                          <TableCell>{formatDate(e.completedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
