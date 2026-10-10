'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import FileViewer from '@/components/molecules/file-viewer/fileViewer';
import {
  useAssignmentSubmissionsInfinite,
  useGradeAssignment,
} from '@/lib/hooks/course/content/assignments';
import type {
  AssignmentSubmissionInfo,
  GradeAssignmentPayload,
} from '@/lib/types/course/DTO/assignmentSubmission.dto';
import { ExternalLink, FileText, Loader2, Users } from 'lucide-react';
import { toast } from 'react-toastify';

function normalizeStudentId(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw != null && typeof raw === 'object' && '_id' in raw) {
    const id = (raw as { _id?: unknown })._id;
    if (typeof id === 'string') return id;
    if (id != null && typeof (id as { toString?: () => string }).toString === 'function')
      return (id as { toString: () => string }).toString();
  }
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'bigint') {
    return String(raw);
  }
  return '';
}

function formatBytes(n?: number): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeTypeFromFileKey(fileKey: string): string {
  const lower = fileKey.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return '';
}

function SubmissionGradeRow({
  assignmentId,
  maxPoints,
  submission,
  onGrade,
  savingStudentId,
}: {
  assignmentId: string;
  maxPoints: number;
  submission: AssignmentSubmissionInfo;
  onGrade: (payload: GradeAssignmentPayload) => void;
  savingStudentId: string | null;
}) {
  const t = useTranslations('CreateContentForm.assignmentSubmissions');
  const studentId = normalizeStudentId(submission.studentId);
  const [score, setScore] = useState<string>(
    submission.score !== undefined && submission.score !== null ? String(submission.score) : ''
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? '');

  useEffect(() => {
    setScore(
      submission.score !== undefined && submission.score !== null ? String(submission.score) : ''
    );
    setFeedback(submission.feedback ?? '');
  }, [submission.score, submission.feedback, studentId]);

  const isSavingThis = savingStudentId === studentId;

  const handleSave = () => {
    const parsed = Number.parseFloat(score);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > maxPoints) {
      toast.error(t('invalidScore', { max: maxPoints }));
      return;
    }
    onGrade({
      assignmentId,
      studentId,
      score: parsed,
      feedback: feedback.trim() || undefined,
    });
  };

  const submittedLabel = submission.submittedAt
    ? new Date(submission.submittedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  const fileLabel = submission.fileKey?.split('/').pop() ?? t('submittedFile');
  const displayStudentLabel = submission.studentName?.trim() ?? studentId;

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{displayStudentLabel}</CardTitle>
            <p className="text-muted-foreground mt-2 text-sm">
              <span className="font-medium">{t('submittedAt')}:</span> {submittedLabel}
            </p>
          </div>
          {submission.score !== undefined && submission.score !== null ? (
            <Badge variant="secondary">
              {t('graded')}: {submission.score} / {maxPoints}
            </Badge>
          ) : (
            <Badge variant="outline">{t('pendingGrade')}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.content ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('textAnswer')}</p>
            <div className="bg-muted/50 rounded-md border p-3 text-sm whitespace-pre-wrap">
              {submission.content}
            </div>
          </div>
        ) : null}

        {submission.fileUrl ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="font-medium">{t('file')}</span>
              {submission.mimeType ||
              (submission.fileKey ? mimeTypeFromFileKey(submission.fileKey) : '') ? (
                <Badge variant="outline">
                  {submission.mimeType ?? mimeTypeFromFileKey(submission.fileKey ?? '')}
                </Badge>
              ) : null}
              <span className="text-muted-foreground">{formatBytes(submission.fileSizeBytes)}</span>
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm underline">
                <ExternalLink className="h-3.5 w-3.5" />
                {t('openFile')}
              </a>
            </div>
            {(() => {
              const effectiveMime =
                submission.mimeType?.trim() ??
                (submission.fileKey ? mimeTypeFromFileKey(submission.fileKey) : '') ??
                'application/octet-stream';
              return (
                <FileViewer
                  url={submission.fileUrl}
                  mimeType={effectiveMime}
                  fileName={fileLabel}
                  previewLabel={t('filePreview')}
                  previewNotAvailableLabel={t('previewNotAvailable')}
                  className="bg-muted/30 rounded-md border"
                />
              );
            })()}
          </div>
        ) : null}

        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`score-${studentId}`}>
              {t('score')} ({t('scoreOutOf', { max: maxPoints })})
            </label>
            <Input
              id={`score-${studentId}`}
              type="number"
              min={0}
              max={maxPoints}
              step="0.5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              disabled={isSavingThis}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor={`feedback-${studentId}`}>
              {t('feedback')}
            </label>
            <Textarea
              id={`feedback-${studentId}`}
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('feedbackPlaceholder')}
              disabled={isSavingThis}
            />
          </div>
        </div>
        <Button type="button" onClick={() => void handleSave()} disabled={isSavingThis}>
          {isSavingThis ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveGrade')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface AssignmentSubmissionsPanelProps {
  assignmentId: string;
}

export default function AssignmentSubmissionsPanel({
  assignmentId,
}: AssignmentSubmissionsPanelProps) {
  const t = useTranslations('CreateContentForm.assignmentSubmissions');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gradeMutation = useGradeAssignment();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAssignmentSubmissionsInfinite(assignmentId);

  const savingStudentId =
    gradeMutation.isPending && gradeMutation.variables?.studentId
      ? gradeMutation.variables.studentId
      : null;

  const meta = data?.pages[0]?.assignment;
  const maxPoints = meta?.maxPoints ?? 100;
  const total = data?.pages[0]?.total;

  const submissions = useMemo(() => {
    const list = data?.pages.flatMap((p) => p.submissions ?? []) ?? [];
    return list;
  }, [data?.pages]);

  const onLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '160px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('loading')}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="text-destructive py-8">{t('loadError')}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
        {meta ? (
          <div className="text-muted-foreground mt-2 space-y-1 text-sm">
            {meta.dueDate ? (
              <p>
                <span className="text-foreground font-medium">{t('dueLabel')}:</span>{' '}
                {new Date(meta.dueDate).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            ) : null}
            <p>
              <span className="text-foreground font-medium">{t('maxPointsLabel')}:</span>{' '}
              {maxPoints}
            </p>
            {meta.instructions ? (
              <div className="pt-1">
                <span className="text-foreground font-medium">{t('instructionsLabel')}:</span>
                <p className="mt-1 whitespace-pre-wrap">{meta.instructions}</p>
              </div>
            ) : null}
            {total === undefined ? null : (
              <p className="pt-1">
                <span className="text-foreground font-medium">{t('totalSubmissions')}:</span>{' '}
                {total}
              </p>
            )}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {submissions.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center">{t('empty')}</p>
        ) : (
          <>
            {submissions.map((sub: AssignmentSubmissionInfo) => (
              <SubmissionGradeRow
                key={normalizeStudentId(sub.studentId)}
                assignmentId={assignmentId}
                maxPoints={maxPoints}
                submission={sub}
                onGrade={(payload) => gradeMutation.mutate(payload)}
                savingStudentId={savingStudentId}
              />
            ))}
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
            {isFetchingNextPage ? (
              <div className="text-muted-foreground flex justify-center gap-2 py-4 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('loadMore')}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
