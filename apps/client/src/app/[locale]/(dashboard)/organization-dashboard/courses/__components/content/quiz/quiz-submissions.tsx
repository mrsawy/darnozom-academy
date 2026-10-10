'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/atoms/collapsible';
import { useQuizSubmissionsForOrganization } from '@/lib/hooks/course/content/quiz';
import type {
  QuizIntegrityEventDto,
  QuizSubmissionStoredAnswerDetail,
  StudentQuizSubmissionItem,
} from '@/lib/types/course/DTO/quizSubmission.dto';
import { cn } from '@/lib/utils';
import { AlertCircle, ClipboardList, ChevronDown, Loader2, Shield, Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import QuizSubmissionsSkeleton from './quiz-submissions.skeleton';

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

const KNOWN_INTEGRITY_TYPES = [
  'fullscreen_enter',
  'fullscreen_exit',
  'visibility_hidden',
  'visibility_visible',
  'window_blur',
  'copy_attempt',
  'paste_attempt',
  'cut_attempt',
  'context_menu',
  'keydown_c_modifier',
  'keydown_v_modifier',
  'keydown_x_modifier',
  /** Mobile / React Native (see `useQuizIntegrityMobile`) */
  'app_inactive',
  'app_background',
  'app_foreground',
  'network_state_change',
  'clipboard_change',
] as const;

function networkTypeLabel(
  netType: string,
  t: ReturnType<typeof useTranslations<'CreateContentForm.quizSubmissions'>>
): string {
  switch (netType) {
    case 'cellular': {
      return t('integrityNetwork.types.cellular');
    }
    case 'wifi': {
      return t('integrityNetwork.types.wifi');
    }
    case 'none': {
      return t('integrityNetwork.types.none');
    }
    case 'bluetooth': {
      return t('integrityNetwork.types.bluetooth');
    }
    case 'ethernet': {
      return t('integrityNetwork.types.ethernet');
    }
    case 'wimax': {
      return t('integrityNetwork.types.wimax');
    }
    case 'vpn': {
      return t('integrityNetwork.types.vpn');
    }
    case 'other': {
      return t('integrityNetwork.types.other');
    }
    case 'unknown': {
      return t('integrityNetwork.types.unknown');
    }
    default: {
      return netType;
    }
  }
}

function formatIntegrityEventDetail(
  type: string,
  detail: string,
  t: ReturnType<typeof useTranslations<'CreateContentForm.quizSubmissions'>>
): string {
  if (type !== 'network_state_change') {
    return detail;
  }
  const colon = detail.indexOf(':');
  if (colon === -1) {
    return detail;
  }
  const netType = detail.slice(0, colon);
  const state = detail.slice(colon + 1);
  const typeLabel = networkTypeLabel(netType, t);
  const stateLabel =
    state === 'connected'
      ? t('integrityNetwork.connected')
      : state === 'disconnected'
        ? t('integrityNetwork.disconnected')
        : state;
  return `${typeLabel}: ${stateLabel}`;
}

type KnownIntegrityType = (typeof KNOWN_INTEGRITY_TYPES)[number];

const KNOWN_INTEGRITY_TYPE_SET: ReadonlySet<string> = new Set(KNOWN_INTEGRITY_TYPES);

function isKnownIntegrityType(type: string): type is KnownIntegrityType {
  return KNOWN_INTEGRITY_TYPE_SET.has(type);
}

function isIntegrityEvent(raw: unknown): raw is QuizIntegrityEventDto {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.type === 'string' &&
    typeof o.at === 'string' &&
    (o.detail === undefined || typeof o.detail === 'string')
  );
}

function parseIntegrityEvents(row: StudentQuizSubmissionItem): QuizIntegrityEventDto[] {
  const raw = row.integrityEvents;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isIntegrityEvent)
    .toSorted((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function IntegrityLog({ events }: { events: QuizIntegrityEventDto[] }) {
  const t = useTranslations('CreateContentForm.quizSubmissions');
  const tTypes = useTranslations('CreateContentForm.quizSubmissions.integrityTypes');
  const format = useFormatter();

  const formatAt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format.dateTime(d, { dateStyle: 'short', timeStyle: 'medium' });
  };

  const typeLabel = (type: string) => (isKnownIntegrityType(type) ? tTypes(type) : type);

  return (
    <div className="border-border/80 bg-muted/30 mt-3 rounded-md border px-3 py-2.5">
      <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-2 text-xs font-medium">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>{t('integrityTitle')}</span>
        {events.length > 0 ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {t('integrityEventCount', { count: events.length })}
          </Badge>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t('integrityEmpty')}</p>
      ) : (
        <ul className="custom-scrollbar max-h-96 space-y-1.5 overflow-y-auto pr-0.5 text-xs">
          {events.map((ev, idx) => (
            <li
              key={`${ev.at}-${ev.type}-${idx}`}
              className="border-border/60 flex flex-col gap-0.5 border-b pb-1.5 last:border-b-0 last:pb-0">
              <span className="text-foreground leading-snug font-medium">{typeLabel(ev.type)}</span>
              <span className="text-muted-foreground font-mono text-[10px]">{formatAt(ev.at)}</span>
              {ev.detail ? (
                <span className="text-muted-foreground wrap-break-word">
                  {formatIntegrityEventDetail(ev.type, ev.detail, t)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttemptSummaryMeta({ row }: { row: StudentQuizSubmissionItem }) {
  const t = useTranslations('CreateContentForm.quizSubmissions');
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
        {t('submittedAt')}: {formatSubmittedAt(row.submittedAt)}
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
  const t = useTranslations('CreateContentForm.quizSubmissions');
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

function OrgAttemptRow({ row }: { row: StudentQuizSubmissionItem }) {
  const t = useTranslations('CreateContentForm.quizSubmissions');
  const [open, setOpen] = useState(false);
  const details = parseAttemptAnswers(row);
  const integrityEvents = parseIntegrityEvents(row);
  const hasDetails = details.length > 0;

  const header = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">
          <span className="text-muted-foreground font-normal">{t('studentName')}: </span>
          <span className="min-w-0 text-sm wrap-break-word">
            {row.studentName?.trim() || row.studentId}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {t('submissionAttempt', { n: row.attemptNumber })}
        </p>
      </div>
      <AttemptSummaryMeta row={row} />
    </div>
  );

  if (!hasDetails) {
    return (
      <div className="rounded-md border px-4 py-3">
        {header}
        <p className="text-muted-foreground mt-2 text-xs">{t('noAnswerBreakdown')}</p>
        <IntegrityLog events={integrityEvents} />
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger
        className="hover:bg-muted/50 flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left text-sm transition-colors"
        type="button">
        <div className="min-w-0 flex-1 space-y-2">
          {header}
          <IntegrityLog events={integrityEvents} />
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground mt-1 h-4 w-4 shrink-0 transition-transform',
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

export default function QuizSubmissions({ quizContentId }: QuizSubmissionsProps) {
  const t = useTranslations('CreateContentForm.quizSubmissions');
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useQuizSubmissionsForOrganization(quizContentId);

  const items = useMemo((): StudentQuizSubmissionItem[] => {
    const inf = data;
    return inf?.pages.flatMap((p) => p.items) ?? [];
  }, [data]);

  const total = data?.pages[0]?.total ?? 0;

  if (isLoading && !data) {
    return <QuizSubmissionsSkeleton />;
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="text-destructive h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('loadError')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive mb-4 text-sm">
            {error instanceof Error ? error.message : t('loadError')}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="text-muted-foreground h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
        {total > 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 pt-1 text-sm">
            <Users className="h-4 w-4" />
            {t('totalCount', { count: total })}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((row) => (
              <li key={`${row.studentId}-${row.attemptNumber}-${String(row.submittedAt)}`}>
                <OrgAttemptRow row={row} />
              </li>
            ))}
          </ul>
        )}

        {hasNextPage ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}>
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loadMore')}
                </>
              ) : (
                t('loadMoreButton')
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
