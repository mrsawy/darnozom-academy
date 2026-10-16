'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { useParentDashboard } from '@/lib/hooks/dashboard/use-dashboard.hook';
import type { IActionItem, IParentChildCard } from '@darnozom/shared-types';
import {
  ROUTE_PARENT_PAYMENTS,
  ROUTE_PARENT_MY_CERTIFICATES,
} from '@/lib/data/constants/routes.constants';
import { Calendar, User, Loader2, Award, Clock } from 'lucide-react';
import type { IRelatedStudentProgress } from '@/lib/types/parent/parent-progress.interface';

interface ParentDashboardViewProps {
  initialChildrenProgress?: IRelatedStudentProgress[];
}

function formatSessionTime(isoString: string): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function ActionBadge({ item }: { item: IActionItem }) {
  const t = useTranslations('ParentDashboard');

  if (item.type === 'PAYMENT_DUE') {
    return (
      <Link href={ROUTE_PARENT_PAYMENTS}>
        <Badge className="border-amber-300 bg-amber-100 text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          {t('paymentDue')}
        </Badge>
      </Link>
    );
  }

  if (item.type === 'CERT_NAME_REVIEW') {
    return (
      <Link href={ROUTE_PARENT_MY_CERTIFICATES}>
        <Badge className="border-blue-300 bg-blue-100 text-blue-800 transition-colors hover:bg-blue-200 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {t('certNameReview')}
        </Badge>
      </Link>
    );
  }

  if (item.type === 'RECEIPT_REJECTED') {
    return (
      <Link href={ROUTE_PARENT_PAYMENTS}>
        <Badge className="border-red-300 bg-red-100 text-red-800 transition-colors hover:bg-red-200 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300">
          {t('receiptRejected')}
        </Badge>
      </Link>
    );
  }

  return null;
}

function ChildCard({ child }: { child: IParentChildCard }) {
  const t = useTranslations('ParentDashboard');

  return (
    <Card className="flex flex-col justify-between transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5 text-primary" />
            <span>{child.studentName}</span>
          </CardTitle>
          {child.actionItems && child.actionItems.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {child.actionItems.map((action, idx) => (
                <ActionBadge key={`${action.type}-${idx}`} item={action} />
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Groups & Next Session */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t('sessionsAndReports')}
          </h4>
          {!child.groupCards || child.groupCards.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
              {t('noUpcomingSession')}
            </p>
          ) : (
            <div className="space-y-2">
              {child.groupCards.map((group) => (
                <div key={group.groupId} className="rounded-md border bg-muted/30 p-2.5">
                  <p className="text-sm font-medium">{group.groupName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {group.nextSession
                      ? `${t('nextSession')}: ${formatSessionTime(group.nextSession.startsAt)}`
                      : t('noUpcomingSession')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Evaluation */}
        <div className="space-y-1.5 rounded-md border bg-muted/10 p-2.5">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            {t('latestEvaluation')}
          </h4>
          {child.latestEvaluation ? (
            <div className="space-y-1 text-xs">
              <p className="font-medium text-foreground">
                {Object.entries(child.latestEvaluation.scores).length > 0
                  ? Object.entries(child.latestEvaluation.scores)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')
                  : '—'}
              </p>
              {child.latestEvaluation.comment && (
                <p className="italic text-muted-foreground">
                  &ldquo;{child.latestEvaluation.comment}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('noEvaluation')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ParentDashboardView({ initialChildrenProgress: _initial }: ParentDashboardViewProps = {}) {
  const t = useTranslations('ParentDashboard');
  const { data: dashboardData, isLoading } = useParentDashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ms-2 text-sm text-muted-foreground">{t('loading')}</span>
        </div>
      ) : !dashboardData?.children || dashboardData.children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <User className="mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-center text-sm text-muted-foreground">{t('empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardData.children.map((child) => (
            <ChildCard key={child.studentId} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}
