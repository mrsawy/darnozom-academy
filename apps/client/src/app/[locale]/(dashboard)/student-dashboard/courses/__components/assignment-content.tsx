'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import FileViewer from '@/components/molecules/file-viewer/fileViewer';
import { Textarea } from '@/components/atoms/textarea';
import { getAuthUser } from '@/lib/actions/user/user.action';
import {
  getAssignmentSubmissionsAction,
  submitAssignmentAction,
} from '@/lib/actions/courses/content/content.action';
import {
  useMultipartUpload,
  isMultipartUploadCancelled,
} from '@/lib/hooks/file/use-multipart-upload';
import { IContent } from '@/lib/types/course/content.interface';
import { slugify } from '@/lib/utils/slugify';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Progress } from '@/components/atoms/progress';
import { useParams } from 'next/navigation';
import type { GetAssignmentSubmissionsResponse } from '@/lib/types/course/DTO/assignmentSubmission.dto';
import type { NatsErr } from '@/lib/utils/natsErrorHandler';

function isNatsErrPayload(value: unknown): value is NatsErr {
  return typeof value === 'object' && value !== null && 'err' in value;
}

function assertSubmissionsPayload(
  value: GetAssignmentSubmissionsResponse | NatsErr
): asserts value is GetAssignmentSubmissionsResponse {
  if (isNatsErrPayload(value)) {
    throw new Error(value.err.message);
  }
}

function assertSubmitAssignmentPayload(
  value: { message: string; assignmentId: string } | NatsErr
): asserts value is { message: string; assignmentId: string } {
  if (isNatsErrPayload(value)) {
    throw new Error(value.err.message);
  }
}

const SUBMISSION_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

interface AssignmentContentProps {
  content: IContent;
}

function ensurePrivateKey(fileKey: string): string {
  const trimmed = fileKey.trim().replace(/^\/+/, '');
  if (trimmed.startsWith('private/') || trimmed.startsWith('public/')) {
    return trimmed;
  }
  return `private/${trimmed}`;
}

function buildFileKey(file: File, customPath: string): string {
  const lastDotIndex = file.name.lastIndexOf('.');
  const fileExtension = lastDotIndex > 0 ? file.name.slice(lastDotIndex + 1) : '';
  const baseFileName = lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;
  const slugifiedBaseName = slugify(baseFileName);
  const fileName = fileExtension ? `${slugifiedBaseName}.${fileExtension}` : slugifiedBaseName;
  return `${customPath}/${globalThis.crypto.randomUUID()}_${fileName}`;
}

export default function AssignmentContent({ content }: AssignmentContentProps) {
  const t = useTranslations('StudentCourses.assignmentContent');
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<
    NonNullable<IContent['submissions']>[number] | null
  >(null);
  const {
    upload: multipartUpload,
    error: uploadError,
    progress: uploadProgress,
    status: uploadStatus,
  } = useMultipartUpload();
  const [submissionFilePreview, setSubmissionFilePreview] = useState<string | null>(null);
  const params = useParams();
  const enrollmentId = params.id as string;
  const localeParams = useLocale();
  const dueDate = useMemo(
    () => (content.dueDate ? new Date(content.dueDate) : null),
    [content.dueDate]
  );

  useEffect(() => {
    if (!submissionFile?.type.startsWith('image/')) {
      setSubmissionFilePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(submissionFile);
    setSubmissionFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [submissionFile]);
  const isLate = dueDate ? new Date() > dueDate : false;
  const hasAssignmentFile = Boolean(content.fileUrl);

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        const data = await getAssignmentSubmissionsAction({ assignmentId: content._id });
        assertSubmissionsPayload(data);
        if (data.submission) {
          setExistingSubmission(data.submission);
          if (data.submission.content) {
            setSubmissionText(data.submission.content);
          }
        }
      } catch {
        // Keep page usable even if submission metadata fails to load.
      }
    };
    void loadSubmission();
  }, [content._id]);

  const handleSubmit = async () => {
    if (existingSubmission) return;
    if (!submissionText.trim() && !submissionFile) {
      toast.error(t('submissionRequired'));
      return;
    }
    if (isLate) {
      toast.error(t('lateSubmissionNotAllowed'));
      return;
    }

    setIsSubmitting(true);
    try {
      let fileKey: string | undefined;
      let fileSizeBytes: number | undefined;
      let mimeType: string | undefined;

      if (submissionFile) {
        const user = await getAuthUser();
        if (!user?.organization?.slug && !user?.organization?._id) {
          toast.error(t('organizationNotFound'));
          setIsSubmitting(false);
          return;
        }

        const customPath = `${user.organization?.slug ?? user.organization?._id}/courses/${content.courseId}/assignments/${content._id}/submissions`;
        const key = buildFileKey(submissionFile, customPath);
        const uploadedKey = await multipartUpload(submissionFile, key, {
          isPublic: false,
          contentId: content._id,
          enrollmentId,
        });
        if (!uploadedKey) {
          toast.error(uploadError ?? t('uploadFailed'));
          setIsSubmitting(false);
          return;
        }

        fileKey = ensurePrivateKey(uploadedKey);
        fileSizeBytes = submissionFile.size;
        mimeType = submissionFile.type;
      }

      const result = await submitAssignmentAction({
        assignmentId: content._id,
        enrollmentId,
        content: submissionText.trim() || undefined,
        fileKey,
        fileSizeBytes,
        mimeType,
      });

      assertSubmitAssignmentPayload(result);
      toast.success(result.message ?? t('submitted'));

      const refreshed = await getAssignmentSubmissionsAction({
        assignmentId: content._id,
        enrollmentId,
        locale: localeParams,
      });
      assertSubmissionsPayload(refreshed);
      setExistingSubmission(refreshed.submission ?? null);
    } catch (error) {
      if (isMultipartUploadCancelled(error)) {
        return;
      }
      toast.error(error instanceof Error ? error.message : t('failedToSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {hasAssignmentFile ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('assignmentFiles')}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {content.mimeType ? <Badge variant="outline">{content.mimeType}</Badge> : null}
              {content.fileSizeBytes ? (
                <Badge variant="outline">{Math.round(content.fileSizeBytes / 1024)} KB</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('viewAssignmentFile')}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={content.fileUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  {t('downloadAssignmentFile')}
                </a>
              </Button>
            </div>
            <FileViewer
              url={content.fileUrl}
              fileName={content.title}
              previewLabel={t('preview')}
              previewNotAvailableLabel={t('previewNotAvailable')}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('assignmentInstructions')}</CardTitle>
          <div className="flex gap-2">
            {content.maxPoints ? (
              <Badge variant="outline">
                {t('maxPoints')} {content.maxPoints}
              </Badge>
            ) : null}
            {content.dueDate ? (
              <Badge variant="outline">
                {t('due')} {new Date(content.dueDate).toLocaleDateString()}
              </Badge>
            ) : null}
            {isLate ? <Badge variant="destructive">{t('pastDue')}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed">
            {content.instructions ?? t('defaultInstructions')}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('yourSubmission')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingSubmission ? null : (
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('attachmentOptional')}</span>
              <DropzoneWithPreview
                accept={SUBMISSION_ACCEPT}
                maxFiles={1}
                files={submissionFile ? [submissionFile] : undefined}
                filePreview={submissionFilePreview ?? null}
                handleDrop={(files) => setSubmissionFile(files[0] ?? null)}
              />
            </div>
          )}
          {submissionFile && !existingSubmission ? (
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('preview')}</span>
              <FileViewer
                file={submissionFile}
                fileName={submissionFile.name}
                previewLabel={t('preview')}
                previewNotAvailableLabel={t('previewNotAvailable')}
              />
            </div>
          ) : null}
          {existingSubmission ? null : (
            <Textarea
              placeholder={t('placeholder')}
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              className="min-h-48 text-base"
              disabled={!!existingSubmission}
            />
          )}
          {existingSubmission?.submittedAt ? (
            <p className="text-muted-foreground mt-2 text-sm">
              {t('submittedAt')} {new Date(existingSubmission.submittedAt).toLocaleString()}
            </p>
          ) : null}
          {existingSubmission?.fileUrl ? (
            <div className="mt-4 space-y-2">
              <span className="text-sm font-medium">{t('yourSubmittedFile')}</span>
              <FileViewer
                url={existingSubmission.fileUrl}
                mimeType={existingSubmission.mimeType}
                fileName={t('submittedFile')}
                previewLabel={t('preview')}
                previewNotAvailableLabel={t('previewNotAvailable')}
              />
              <div className="flex gap-2">
                {/* <Button asChild variant="outline" size="sm">
                  <a href={existingSubmission.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('viewAssignmentFile')}
                  </a>
                </Button> */}
                <Button asChild variant="outline" size="sm">
                  <a
                    href={existingSubmission.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {t('downloadAssignmentFile')}
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
          {existingSubmission?.content ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">{t('yourSubmittedContent')}</p>
              <Textarea value={existingSubmission.content} disabled />
            </div>
          ) : null}
          {typeof existingSubmission?.score === 'number' ? (
            <p className="mt-1 text-sm">
              {t('graded')}: {existingSubmission.score}
              {existingSubmission.feedback ? ` - ${existingSubmission.feedback}` : ''}
            </p>
          ) : existingSubmission ? (
            <p className="mt-1 text-sm">{t('notYetGraded')}</p>
          ) : null}
        </CardContent>
      </Card>

      {isSubmitting ? (
        <Card className="border-primary/20 bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {uploadStatus === 'uploading' ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('uploadingFile')} {uploadProgress}%
                  </div>
                  <Progress value={uploadProgress} className="h-2 w-full max-w-md" />
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('submitting')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || isLate || !!existingSubmission}
          size="lg">
          {existingSubmission
            ? t('alreadySubmitted')
            : isSubmitting
              ? t('submitting')
              : t('submitAssignment')}
        </Button>
      </div>
    </div>
  );
}
