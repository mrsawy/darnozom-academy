'use client';

import { useTranslations } from 'next-intl';
import { Award, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { DonutChart } from '@/components/atoms/charts/donut-chart';
import { LineChart } from '@/components/atoms/charts/line-chart';
import { ProgressChart } from '@/components/atoms/charts/progress-chart';

const PROGRESS_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];
const ACTIVITY_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const QUIZ_SCORE_SERIES = [
  { date: 'W1', score: 58 },
  { date: 'W2', score: 71 },
  { date: 'W3', score: 100 },
  { date: 'W4', score: 64 },
  { date: 'W5', score: 40 },
  { date: 'W6', score: 70 },
  { date: 'W7', score: 65 },
] as const;

/**
 * Representative sample data only — this is a marketing preview, not a
 * live query against /organization-dashboard. Shapes mirror
 * OrganizationDashboardReports so the hero and the real product match.
 */
function HeroDashboardPreview() {
  const t = useTranslations('Hero.dashboardPreview');

  const progressLabels = [0, 1, 2].map((i) => t(`courseProgress.${i}.label`));
  const progressValues = [78, 54, 32];

  const activityData = [0, 1, 2, 3, 4].map((i) => ({
    type: t(`activity.${i}.label`),
    value: [21, 21, 24, 8, 13][i],
  }));
  const activityTotal = activityData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative aspect-5/4 w-full">
      <div className="bg-dz-sand border-dz-line absolute inset-0 overflow-hidden rounded-[28px] border p-4">
        <div className="bg-background/60 grid h-full grid-cols-2 gap-3 overflow-hidden rounded-2xl p-3">
          <Card className="col-span-2 gap-3 py-3">
            <CardHeader className="gap-0.5 px-4">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="text-dz-terracotta size-4" aria-hidden />
                {t('courseProgress.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <ProgressChart
                data={progressLabels}
                percentages={progressValues}
                colors={PROGRESS_COLORS}
              />
            </CardContent>
          </Card>

          <Card className="gap-2 py-3">
            <CardHeader className="gap-0.5 px-4">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Award className="text-dz-terracotta size-4" aria-hidden />
                {t('quizScores.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1">
              <LineChart
                data={QUIZ_SCORE_SERIES}
                xField="date"
                yField="score"
                height={140}
                showLegend={false}
                hideXAxisLabel
                colors={['var(--chart-1)']}
              />
            </CardContent>
          </Card>

          <Card className="gap-2 py-3">
            <CardHeader className="gap-0.5 px-4">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Users className="text-dz-terracotta size-4" aria-hidden />
                {t('activity.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1">
              <DonutChart
                data={activityData}
                height={140}
                mobileHeight={140}
                innerRadius={34}
                outerRadius={56}
                colors={ACTIVITY_COLORS}
                centerValue={activityTotal}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendance confirmation — overhangs the leading edge. */}
      <div className="bg-dz-paper-raised border-dz-line absolute -start-[18px] bottom-7 flex max-w-[270px] items-center gap-3 rounded-2xl border p-4 shadow-[0_18px_40px_-18px_rgba(58,37,25,0.35)]">
        <span className="bg-dz-leaf size-2.5 shrink-0 rounded-full" />
        <div className="text-[13px] leading-normal">
          <div className="font-semibold">{t('attendance.title')}</div>
          <div className="text-dz-ink-soft">{t('attendance.meta')}</div>
        </div>
      </div>

      {/* Cohort readiness — overhangs the trailing edge, inverted. */}
      <div className="bg-dz-cocoa text-dz-cocoa-ink absolute -end-[12px] top-7 max-w-[220px] rounded-2xl p-4 text-[13px] leading-normal shadow-[0_18px_40px_-18px_rgba(58,37,25,0.5)]">
        <div className="font-semibold">{t('cohort.title')}</div>
        <div className="text-dz-cocoa-soft">{t('cohort.meta')}</div>
      </div>
    </div>
  );
}

export default HeroDashboardPreview;
