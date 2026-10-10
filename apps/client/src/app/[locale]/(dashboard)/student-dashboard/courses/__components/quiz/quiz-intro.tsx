'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { IContent } from '@/lib/types/course/content.interface';
import { AlertTriangle, Clock, HelpCircle, Maximize } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { QuizAvailability } from './quiz-availability';

interface QuizIntroProps {
  content: IContent;
  availability: QuizAvailability;
  onStart: () => void;
  isStarting: boolean;
  /** From `useStudentQuizSubmissions` + `getQuizAttemptState`; while true, Start is disabled. */
  submissionsLoading: boolean;
  submissionsError: boolean;
  hasAttemptsLeft: boolean;
  attemptsUsed: number;
  attemptsLeft: number;
  maxAttempts: number;
}

export function QuizIntro({
  content,
  availability,
  onStart,
  isStarting,
  submissionsLoading,
  submissionsError,
  hasAttemptsLeft,
  attemptsUsed,
  attemptsLeft,
  maxAttempts,
}: QuizIntroProps) {
  const t = useTranslations('StudentCourses.quizContent');
  const totalQuestions = content.questions?.length ?? 0;

  const canStart =
    availability.status === 'active' && hasAttemptsLeft && !submissionsLoading && !submissionsError;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
              <HelpCircle className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl">{t('introTitle')}</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">{t('introSubtitle')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {submissionsError ? (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{t('submissionsError')}</p>
            </div>
          ) : null}
          {availability.status === 'upcoming' ? (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{t('quizNotStartedYet')}</p>
            </div>
          ) : null}
          {availability.status === 'ended' ? (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{t('quizEnded')}</p>
            </div>
          ) : null}

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{t('questionCountLabel')}:</span> {totalQuestions}
            </p>
            {content.quizDurationInMinutes ? (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{t('timeLimitLabel')}:</span>{' '}
                {t('timeLimitValue', { minutes: content.quizDurationInMinutes })}
              </p>
            ) : null}
            <p>
              <span className="font-medium">{t('attemptsLabel')}:</span> {maxAttempts}
            </p>
            <p>
              <span className="font-medium">{t('attemptsProgressLabel')}:</span>{' '}
              {submissionsLoading
                ? t('attemptsProgressLoading')
                : t('attemptsProgress', {
                    used: attemptsUsed,
                    max: maxAttempts,
                    left: attemptsLeft,
                  })}
            </p>
            {!hasAttemptsLeft && !submissionsLoading && !submissionsError ? (
              <p className="text-destructive font-medium">{t('noAttemptsLeft')}</p>
            ) : null}
          </div>

          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <Maximize className="h-4 w-4" />
              {t('fullscreenRequiredTitle')}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('fullscreenRequiredBody')}
            </p>
          </div>

          <p className="text-muted-foreground text-sm">{t('integrityNotice')}</p>

          <Button size="lg" className="w-full" disabled={!canStart || isStarting} onClick={onStart}>
            {isStarting ? t('starting') : t('startQuiz')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
