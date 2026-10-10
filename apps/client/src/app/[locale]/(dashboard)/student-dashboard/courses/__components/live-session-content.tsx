'use client';

import { Button } from '@/components/atoms/button';
import { useToggleContentComplete } from '@/lib/hooks/course/content/useContent';
import { IContent } from '@/lib/types/course/content.interface';
import { Calendar, Clock, ExternalLink, Video, CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ROUTE_STUDENT_LIVE_CALL } from '@/lib/data/constants/routes.constants';
import { MeetingProvider } from '@lms-organization/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';

const EARLY_JOIN_MS = 15 * 60 * 1000;
const DEFAULT_LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

function getLiveSessionTimeWindow(content: IContent): { start: Date; end: Date } | null {
  if (!content.startDate) return null;
  const start = new Date(content.startDate);
  if (Number.isNaN(start.getTime())) return null;
  let end: Date | null = null;
  if (content.endDate) {
    const parsed = new Date(content.endDate);
    if (!Number.isNaN(parsed.getTime())) end = parsed;
  }
  if (!end && content.durationInMinutes != null && content.durationInMinutes > 0) {
    end = new Date(start.getTime() + content.durationInMinutes * 60_000);
  }
  end ??= new Date(start.getTime() + DEFAULT_LIVE_WINDOW_MS);
  return { start, end };
}

function isWithinLiveSessionJoinWindow(content: IContent): boolean {
  const win = getLiveSessionTimeWindow(content);
  if (!win) return false;
  const now = Date.now();
  return now >= win.start.getTime() - EARLY_JOIN_MS && now <= win.end.getTime();
}

type SessionStatus = 'live' | 'upcoming' | 'ended' | 'unknown';

function getSessionStatus(content: IContent): SessionStatus {
  const win = getLiveSessionTimeWindow(content);
  if (!win) return 'unknown';
  const now = Date.now();
  if (now > win.end.getTime()) return 'ended';
  if (now >= win.start.getTime() - EARLY_JOIN_MS) return 'live';
  return 'upcoming';
}

interface LiveSessionContentProps {
  content: IContent;
  isComplete?: boolean;
}

export default function LiveSessionContent({
  content,
  isComplete = false,
}: LiveSessionContentProps) {
  const t = useTranslations('StudentCourses.liveSessionContent');
  const params = useParams();
  const enrollmentId = params.id as string;
  const { mutateAsync: toggleCompleteAsync } = useToggleContentComplete();
  const completingRef = useRef(false);

  const [inWindow, setInWindow] = useState(() => isWithinLiveSessionJoinWindow(content));
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(() =>
    getSessionStatus(content)
  );

  useEffect(() => {
    const win = getLiveSessionTimeWindow(content);
    if (!win) return;
    const openAt = win.start.getTime() - EARLY_JOIN_MS;
    const closeAt = win.end.getTime();
    if (Date.now() >= closeAt) return;
    if (Date.now() >= openAt) {
      setInWindow(true);
      setSessionStatus('live');
      return;
    }
    const interval = setInterval(() => {
      const n = Date.now();
      if (n >= openAt && n <= closeAt) {
        setInWindow(true);
        setSessionStatus('live');
        clearInterval(interval);
      } else if (n > closeAt) {
        setSessionStatus('ended');
        clearInterval(interval);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [content]);

  /** Marks the session attended. Not window-gated: recordings are watched after the live window closes. */
  const markComplete = useCallback(async (): Promise<boolean> => {
    if (isComplete || completingRef.current) return false;
    completingRef.current = true;
    try {
      await toggleCompleteAsync({
        completed: true,
        withToast: false,
        withRefresh: false,
        enrollmentId,
        contentId: content._id,
      });
      return true;
    } catch {
      return false;
    } finally {
      completingRef.current = false;
    }
  }, [isComplete, content._id, toggleCompleteAsync, enrollmentId]);

  /** Used for the join actions: attendance only counts while the join window is actually open. */
  const markCompleteIfInWindow = useCallback((): Promise<boolean> => {
    if (!isWithinLiveSessionJoinWindow(content)) return Promise.resolve(false);
    return markComplete();
  }, [content, markComplete]);

  const onJoinMeetingClick = useCallback(() => {
    void markCompleteIfInWindow();
  }, [markCompleteIfInWindow]);
  const onRecordingClick = useCallback(() => {
    void markComplete();
  }, [markComplete]);

  const startDate = content.startDate ? new Date(content.startDate) : null;
  const endDate = content.endDate ? new Date(content.endDate) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {/* ── Hero Card ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950 shadow-xl ring-1 ring-white/5">
        {/* ambient glow layers */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-600/15 blur-3xl" />

        <div className="relative space-y-5 p-6">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            {sessionStatus === 'live' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-red-400 ring-1 ring-red-500/25">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                {t('liveNow')}
              </span>
            )}
            {sessionStatus === 'upcoming' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-amber-400 ring-1 ring-amber-500/25">
                <Clock className="h-3 w-3" />
                {t('upcoming')}
              </span>
            )}
            {sessionStatus === 'ended' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-zinc-400 ring-1 ring-zinc-500/25">
                {t('ended')}
              </span>
            )}
            {isComplete ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
                <CheckCircle2 className="h-3 w-3" />
                {t('attended')}
              </span>
            ) : null}
          </div>

          {/* Icon + title */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600/20 ring-1 ring-violet-500/30">
              <Video className="h-7 w-7 text-violet-300" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-white/30 uppercase">
                {t('title')}
              </p>
              <h2 className="text-xl font-bold text-white">{content.title}</h2>
            </div>
          </div>

          {/* Time tiles */}
          {(startDate ?? endDate ?? content.durationInMinutes) ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {startDate ? (
                <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium tracking-wider text-white/30 uppercase">
                    <Calendar className="h-3 w-3" />
                    {t('start')}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-white/50">
                    {startDate.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ) : null}
              {endDate ? (
                <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                  <p className="mb-1 text-[10px] font-medium tracking-wider text-white/30 uppercase">
                    {t('end')}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-white/50">
                    {endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : null}
              {content.durationInMinutes ? (
                <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium tracking-wider text-white/30 uppercase">
                    <Clock className="h-3 w-3" />
                    {t('duration')}
                  </p>
                  <p className="text-sm font-semibold text-white">{content.durationInMinutes}</p>
                  <p className="text-xs text-white/50">{t('minutesShort')}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Join CTA */}
          {content.provider === MeetingProvider.AGORA ? (
            inWindow ? (
              <Button
                asChild
                className="h-12 w-full rounded-xl border-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:scale-[1.01] hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-800/50"
                onClick={onJoinMeetingClick}>
                <Link href={ROUTE_STUDENT_LIVE_CALL(enrollmentId, content._id)}>
                  <Video className="mr-2 h-4 w-4" />
                  {t('joinSession')}
                </Link>
              </Button>
            ) : (
              <p className="py-1 text-center text-sm text-white/30">{t('sessionNotStarted')}</p>
            )
          ) : content.meetingUrl ? (
            inWindow ? (
              <Button
                asChild
                className="h-12 w-full rounded-xl border-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:scale-[1.01] hover:from-violet-500 hover:to-indigo-500"
                onClick={onJoinMeetingClick}>
                <a href={content.meetingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('joinSession')}
                </a>
              </Button>
            ) : (
              <p className="py-1 text-center text-sm text-white/30">{t('sessionNotStarted')}</p>
            )
          ) : (
            <p className="py-1 text-center text-sm text-white/30">{t('noMeetingLink')}</p>
          )}
        </div>
      </div>

      {/* ── Meeting credentials ───────────────────────────────── */}
      {(content.meetingId ?? content.meetingPassword) ? (
        <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
            {t('meetingDetails')}
          </p>
          {content.meetingId ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">{t('meetingId')}</span>
              <code className="bg-muted rounded-lg px-3 py-1 font-mono text-sm">
                {content.meetingId}
              </code>
            </div>
          ) : null}
          {content.meetingPassword ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">{t('meetingPassword')}</span>
              <code className="bg-muted rounded-lg px-3 py-1 font-mono text-sm">
                {content.meetingPassword}
              </code>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Instructions ─────────────────────────────────────── */}
      {content.instructions ? (
        <div className="border-border bg-card rounded-2xl border p-4">
          <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-widest uppercase">
            {t('instructions')}
          </p>
          <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
            {content.instructions}
          </p>
        </div>
      ) : null}

      {/* ── Recordings ───────────────────────────────────────── */}
      {(content.recordingUrl ?? content.recordedSession) ? (
        <div className="flex flex-col gap-2">
          {content.recordingUrl ? (
            <Button
              asChild
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={onRecordingClick}>
              <a href={content.recordingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('watchRecording')}
              </a>
            </Button>
          ) : null}
          {content.recordedSession ? (
            <Button
              asChild
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={onRecordingClick}>
              <a href={content.recordedSession} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('recordedSession')}
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Attendance is derived from genuine engagement (joining the session or watching the
          recording) rather than a free-form toggle, so students can't self-mark attendance
          without actually joining/watching. Kept here, disabled, for parity with mobile in case
          a manual override is ever needed again. */}
      {/* <div className="flex justify-end pb-2">
        <Button
          variant={isComplete ? 'outline' : 'default'}
          className={cn(
            'rounded-xl',
            !isComplete && 'border-0 bg-emerald-600 text-white hover:bg-emerald-700'
          )}
          onClick={() =>
            void markComplete()
          }>
          {isComplete ? t('markAsNotAttended') : t('markAsAttended')}
        </Button>
      </div> */}
    </div>
  );
}
