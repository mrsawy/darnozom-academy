import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, Layers, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Progress } from '@/components/atoms/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { getRelatedStudentEnrollmentDetails } from '@/lib/actions/parent/parent-progress.action';
import type { IRelatedStudentEnrollmentDetails } from '@/lib/types/parent/parent-progress.interface';
import type { NatsErr } from '@/lib/utils/createNatsRequest';
import { ROUTE_PARENT_DASHBOARD } from '@/lib/data/constants/routes.constants';

function isNatsErrPayload(value: IRelatedStudentEnrollmentDetails | NatsErr): value is NatsErr {
  return typeof value === 'object' && value !== null && 'err' in value;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDuration(minutes?: number): string {
  const safeMinutes = Math.max(0, minutes ?? 0);
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTextCase(value?: string): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isValidEnrollmentId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export default async function ParentEnrollmentDetailsRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidEnrollmentId(id)) {
    notFound();
  }
  const t = await getTranslations('ParentEnrollmentDetails');
  const enrollmentPayload = await getRelatedStudentEnrollmentDetails(id);
  if (isNatsErrPayload(enrollmentPayload)) {
    notFound();
  }
  const data = enrollmentPayload;

  const studentName =
    [data.student.firstName, data.student.lastName].filter(Boolean).join(' ') ||
    data.student.username;
  const progress =
    data.summary.totalContents > 0
      ? Math.min(100, Math.max(0, Number(data.enrollment.progressPercentage ?? 0)))
      : 0;
  const contentTracking = data.enrollment.progress?.contentTimeTracking ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle', { student: studentName, course: data.course.name })}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={ROUTE_PARENT_DASHBOARD}>
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ListChecks className="h-4 w-4" />
              {t('summary.progress')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-2xl font-bold">{progress.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4" />
              {t('summary.timeSpent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatDuration(data.enrollment.timeSpentMinutes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Layers className="h-4 w-4" />
              {t('summary.modules')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.summary.completedModules}/{data.summary.totalModules}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {t('summary.contents')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.summary.completedContents}/{data.summary.totalContents}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('enrollment.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('enrollment.accessType')}: </span>
              <span>{formatTextCase(data.enrollment.accessType)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('enrollment.enrolledAt')}: </span>
              <span>{formatDate(data.enrollment.enrolledAt)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('enrollment.lastAccessedAt')}: </span>
              <span>{formatDate(data.enrollment.lastAccessedAt)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('enrollment.completedAt')}: </span>
              <span>{formatDate(data.enrollment.completedAt)}</span>
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('enrollment.subscriptionStatus')}: </span>
              <span>{formatTextCase(data.enrollment.subscription?.status)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">
                {t('enrollment.subscriptionStartsAt')}:{' '}
              </span>
              <span>{formatDate(data.enrollment.subscription?.starts_at)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('enrollment.subscriptionEndsAt')}: </span>
              <span>{formatDate(data.enrollment.subscription?.ends_at)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('enrollment.certificate')}: </span>
              <Badge variant={data.enrollment.certificate?.issued ? 'default' : 'secondary'}>
                {data.enrollment.certificate?.issued
                  ? t('enrollment.certificateIssued')
                  : t('enrollment.certificateNotIssued')}
              </Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('billing.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p>
            <span className="text-muted-foreground">{t('billing.amount')}: </span>
            <span>
              {data.enrollment.subscription?.billing?.amount ?? '—'}{' '}
              {data.enrollment.subscription?.billing?.currency ?? ''}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">{t('billing.billingCycle')}: </span>
            <span>{formatTextCase(data.enrollment.subscription?.billing?.billingCycle)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t('billing.email')}: </span>
            <span>{data.enrollment.subscription?.billing?.email ?? '—'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t('billing.phone')}: </span>
            <span>{data.enrollment.subscription?.billing?.phone_number ?? '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t('course.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('course.name')}: </span>
              <span>{data.course.name}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('course.shortDescription')}: </span>
              <span>{data.course.shortDescription ?? '—'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('course.description')}: </span>
              <span>{data.course.description ?? '—'}</span>
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('course.learningObjectives')}</p>
            {data.course.learningObjectives?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {data.course.learningObjectives.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">—</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('modules.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.course.modules.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('modules.empty')}</p>
          ) : (
            data.course.modules.map((module) => (
              <div key={module._id} className="rounded-lg border p-4">
                <h3 className="font-semibold">{module.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{module.description ?? '—'}</p>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium">{t('modules.learningObjectives')}</p>
                  {module.learningObjectives?.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {module.learningObjectives.map((item, index) => (
                        <li key={`${module._id}-objective-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                </div>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('modules.contentTitle')}</TableHead>
                        <TableHead>{t('modules.contentType')}</TableHead>
                        <TableHead>{t('modules.contentDescription')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {module.contents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-muted-foreground text-center">
                            {t('modules.noContents')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        module.contents.map((content) => (
                          <TableRow key={content._id}>
                            <TableCell className="font-medium">{content.title}</TableCell>
                            <TableCell>{formatTextCase(content.type)}</TableCell>
                            <TableCell>{content.description ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('activity.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {contentTracking.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('activity.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('activity.content')}</TableHead>
                  <TableHead>{t('activity.type')}</TableHead>
                  <TableHead className="text-right">{t('activity.timeSpent')}</TableHead>
                  <TableHead>{t('activity.lastAccessed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentTracking.map((item) => (
                  <TableRow key={item.contentId}>
                    <TableCell className="font-medium">{item.contentTitle ?? '—'}</TableCell>
                    <TableCell>{formatTextCase(item.contentType)}</TableCell>
                    <TableCell className="text-right">
                      {formatDuration(item.timeSpentMinutes)}
                    </TableCell>
                    <TableCell>{formatDate(item.lastAccessedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
