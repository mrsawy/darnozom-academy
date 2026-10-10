'use client';

import { useState } from 'react';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/atoms/collapsible';
import { useStudentQuizSubmissions } from '@/lib/hooks/course/content/quiz';
import type {
  QuizSubmissionStoredAnswerDetail,
  StudentQuizSubmissionItem,
} from '@/lib/types/course/DTO/quizSubmission.dto';
import { cn } from '@/lib/utils';
import { ClipboardList, ChevronDown, Loader2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

export interface QuizSubmissionsProps {
  quizContentId: string;
}

const UNANSWERED = -1;

function isStoredAnswerDetail(raw: unknown): raw is QuizSubmissionStoredAnswerDetail {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.questionIndex === 'number' &&
    typeof o.questionText === 'string' &&
    Array.isArray(o.options) &&
    o.options.every((x) => typeof x === 'string') &&
    typeof o.correctOption === 'number' &&
    typeof o.selectedOption === 'number' &&
    typeof o.isCorrect === 'boolean'
  );
}

function parseAttemptAnswers(row: StudentQuizSubmissionItem): QuizSubmissionStoredAnswerDetail[] {
  const raw = row.answers;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isStoredAnswerDetail);
}

function AttemptBreakdown({ row }: { row: StudentQuizSubmissionItem }) {
  const t = useTranslations('StudentCourses.quizContent');
  const [open, setOpen] = useState(false);
  const details = parseAttemptAnswers(row);
  const hasDetails = details.length > 0;

  if (!hasDetails) {
    return (
      <div className="rounded-md border px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">
            {t('submissionAttempt', { n: row.attemptNumber })}
          </span>
          <AttemptSummaryMeta row={row} />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">{t('noAnswerBreakdown')}</p>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger
        className="hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors"
        type="button">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium">{t('submissionAttempt', { n: row.attemptNumber })}</span>
          <AttemptSummaryMeta row={row} />
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border-t px-4 py-4">
          {details.map((d) => (
            <QuestionAnswerBlock key={d.questionIndex} detail={d} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AttemptSummaryMeta({ row }: { row: StudentQuizSubmissionItem }) {
  const t = useTranslations('StudentCourses.quizContent');
  const format = useFormatter();

  const formatSubmittedAt = (value: Date | string) => {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '—';
    return format.dateTime(d, { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
      <span>
        {t('scoreLabel')}: <span className="text-foreground font-medium">{row.score}</span>
      </span>
      <span>
        {t('submittedAtLabel')}: {formatSubmittedAt(row.submittedAt)}
      </span>
      {row.timeTakenInSeconds == null ? null : (
        <span>
          {t('timeTakenLabel')}: {t('timeTakenSeconds', { seconds: row.timeTakenInSeconds })}
        </span>
      )}
    </div>
  );
}

function optionLetter(index: number): string {
  if (index >= 0 && index < 26) return String.fromCodePoint(65 + index);
  return String(index + 1);
}

function QuestionAnswerBlock({ detail }: { detail: QuizSubmissionStoredAnswerDetail }) {
  const t = useTranslations('StudentCourses.quizContent');
  const { options, correctOption, selectedOption, questionText, questionIndex, isCorrect } = detail;

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isCorrect
          ? 'border-green-200 bg-green-50/60 dark:bg-green-950/20'
          : 'border-red-200 bg-red-50/60 dark:bg-red-950/20'
      )}>
      <p className="text-muted-foreground mb-1 text-xs font-medium">
        {t('questionHeading', { n: questionIndex + 1 })}
      </p>
      <p className="mb-3 text-sm leading-snug">{questionText}</p>

      <p className="text-muted-foreground mb-2 text-xs font-medium">{t('allOptionsLabel')}</p>
      <ul className="space-y-2">
        {options.map((text, idx) => {
          const isCorrectChoice = idx === correctOption;
          const isSelected = selectedOption !== UNANSWERED && idx === selectedOption;
          const isWrongSelection = isSelected && !isCorrectChoice;

          return (
            <li
              key={idx}
              className={cn(
                'flex flex-wrap items-start gap-2 rounded-md border px-3 py-2 text-sm',
                isCorrectChoice && 'border-green-500/80 bg-green-100/70 dark:bg-green-950/40',
                isWrongSelection && 'border-destructive/60 bg-destructive/5',
                !isCorrectChoice && !isWrongSelection && 'border-border bg-background/80'
              )}>
              <span className="text-muted-foreground mt-0.5 w-7 shrink-0 font-mono text-xs font-semibold">
                {optionLetter(idx)}.
              </span>
              <span className="min-w-0 flex-1 leading-snug">{text}</span>
              <span className="flex shrink-0 flex-wrap gap-1">
                {isCorrectChoice ? (
                  <Badge
                    variant="secondary"
                    className="border-green-600/30 bg-green-600/15 text-green-900 dark:text-green-100">
                    {t('badgeCorrect')}
                  </Badge>
                ) : null}
                {isSelected ? (
                  <Badge
                    variant="outline"
                    className={cn(isCorrectChoice ? 'border-green-700/40' : 'border-primary/40')}>
                    {t('badgeYours')}
                  </Badge>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {selectedOption === UNANSWERED ? (
        <p className="text-muted-foreground mt-3 text-xs">{t('unansweredLabel')}</p>
      ) : null}
    </div>
  );
}

/** Lists the signed-in student's attempts; uses `useStudentQuizSubmissions` (same query key as parent when both mount). */
export function QuizSubmissions({ quizContentId }: QuizSubmissionsProps) {
  const { data, isLoading, isError } = useStudentQuizSubmissions(quizContentId);
  const submissions = data?.submissions ?? [];

  const t = useTranslations('StudentCourses.quizContent');
  const [sectionOpen, setSectionOpen] = useState(false);

  return (
    <Card className="mt-8 border-dashed py-0">
      <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-5 w-5 shrink-0 transition-transform',
                    sectionOpen && 'rotate-180'
                  )}
                />
                <ClipboardList className="text-muted-foreground h-5 w-5 shrink-0" />
                <CardTitle className="text-lg">{t('submissionsHeading')}</CardTitle>
                {!isLoading && submissions.length > 0 ? (
                  <span className="text-muted-foreground text-sm">({submissions.length})</span>
                ) : null}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="py-5">
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('submissionsLoading')}
              </div>
            ) : null}

            {!isLoading && isError ? (
              <p className="text-destructive py-2 text-sm">{t('submissionsError')}</p>
            ) : null}

            {!isLoading && !isError && submissions.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">{t('noSubmissionsYet')}</p>
            ) : null}

            {!isLoading && !isError && submissions.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {submissions.map((row) => (
                  <li key={`${row.attemptNumber}-${String(row.submittedAt)}`}>
                    <AttemptBreakdown row={row} />
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
