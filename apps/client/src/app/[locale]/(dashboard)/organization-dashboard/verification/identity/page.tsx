'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { IconCircleCheck, IconClock, IconX, IconUpload, IconLoader2 } from '@tabler/icons-react';
import { VerificationStatus, IdentityDocumentType } from '@lms-organization/shared-types';
import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { useVerificationStatus } from '@/lib/hooks/verification/useVerificationStatus';
import { useSubmitIdentityVerification } from '@/lib/hooks/verification/useIdentityVerification';
import {
  useMultipartUpload,
  isMultipartUploadCancelled,
} from '@/lib/hooks/file/use-multipart-upload';

interface FileEntry {
  id: string;
  file: File;
}

/** Match server `FileService.sanitizeFileName` so multipart keys stay safe for S3/CloudFront. */
function sanitizeFileNameForKey(fileName: string): string {
  let sanitized = fileName.replaceAll(/[^a-zA-Z0-9.-]/g, '_').replaceAll(/_{2,}/g, '_');
  while (sanitized.startsWith('_')) sanitized = sanitized.slice(1);
  while (sanitized.endsWith('_')) sanitized = sanitized.slice(0, -1);
  return sanitized || `file_${Date.now()}`;
}

/** `embedded` drops the standalone card chrome so the org-verification wizard can host it inside its own card. */
export default function IdentityVerificationPage({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const t = useTranslations('Verification.identity');
  const cardClassMd = embedded ? '' : 'mx-auto max-w-md rounded-lg border p-8';
  const cardClassLg = embedded ? '' : 'mx-auto max-w-lg rounded-lg border p-8';
  const { data, isLoading } = useVerificationStatus();
  const submitMutation = useSubmitIdentityVerification();
  const { progress, status: uploadStatus, upload: multipartUpload } = useMultipartUpload();

  const [documentType, setDocumentType] = useState<IdentityDocumentType>(
    IdentityDocumentType.NATIONAL_ID
  );
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{ fileIndex: number; total: number } | null>(null);

  const isMultipartActive = uploadStatus === 'uploading';

  useEffect(() => {
    if (!uploading && !isMultipartActive) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading, isMultipartActive]);

  const overallUploadPercent = useMemo(() => {
    if (!uploadMeta || uploadMeta.total === 0) return 0;
    const fraction = (uploadMeta.fileIndex + progress / 100) / uploadMeta.total;
    return Math.min(100, Math.round(fraction * 100));
  }, [uploadMeta, progress]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newEntries = [...e.target.files].map((file) => ({
        id: crypto.randomUUID(),
        file,
      }));
      setFiles((prev) => [...prev, ...newEntries]);
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadMeta(null);
    try {
      const fileKeys: string[] = [];
      const entries = [...files];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const fileKey = `private/verification/${Date.now()}-${i}-${sanitizeFileNameForKey(entry.file.name)}`;
        setUploadMeta({ fileIndex: i, total: entries.length });

        let uploadedKey: string | undefined;
        try {
          uploadedKey = await multipartUpload(entry.file, fileKey, { isPublic: false });
        } catch (err) {
          if (isMultipartUploadCancelled(err)) {
            return;
          }
          throw err;
        }

        if (!uploadedKey) {
          toast.error(t('uploadFailed'));
          return;
        }
        fileKeys.push(uploadedKey);
      }

      setUploadMeta(null);
      await submitMutation.mutateAsync({ documentType, fileKeys });
      setFiles([]);
    } catch {
      // errors handled by hooks / toast
    } finally {
      setUploadMeta(null);
      setUploading(false);
    }
  }, [files, documentType, submitMutation, multipartUpload, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const identity = data?.verification?.identity;
  const status = identity?.status ?? VerificationStatus.UNVERIFIED;

  if (status === VerificationStatus.VERIFIED) {
    return (
      <div className={`${cardClassMd} text-center`}>
        <IconCircleCheck className="text-success mx-auto mb-4 h-16 w-16" />
        <h2 className="mb-2 text-xl font-semibold">{t('verified')}</h2>
        {identity?.reviewedAt ? (
          <p className="text-muted-foreground text-sm">
            {t('verifiedAt', { date: new Date(identity.reviewedAt).toLocaleDateString() })}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === VerificationStatus.PENDING) {
    const docType = identity?.documentType;
    return (
      <div className={cardClassLg} role="status" aria-live="polite">
        <div className="border-warning/25 bg-warning/10 rounded-lg border p-5">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-start">
            <div className="bg-background/60 flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
              <IconClock className="text-warning h-8 w-8" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-lg font-semibold">{t('underReviewTitle')}</h2>
                <span className="bg-warning/15 text-warning inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {t('underReviewBadge')}
                </span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('pendingDescription')}
              </p>
              {docType ? (
                <p className="text-sm font-medium">
                  {t('pendingSubmittedAs', { type: t(`documentTypes.${docType}`) })}
                </p>
              ) : null}
              {identity?.submittedAt ? (
                <p className="text-muted-foreground text-xs">
                  {t('submittedAt', { date: new Date(identity.submittedAt).toLocaleDateString() })}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = status === VerificationStatus.REJECTED;
  /** Show bar for whole multi-file upload; hook status is `completed` briefly between files. */
  const showUploadProgress = uploading && uploadMeta !== null;
  /** After S3 uploads, `uploadMeta` is cleared while the verification API runs. */
  const showSubmittingReview = uploading && uploadMeta === null;

  return (
    <div className={cardClassLg}>
      {isRejected ? (
        <div className="bg-destructive/10 mb-6 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <IconX className="text-destructive h-5 w-5" />
            <h3 className="text-destructive font-semibold">{t('rejected')}</h3>
          </div>
          {identity?.rejectionMessage ? (
            <p className="mt-2 text-sm">
              {t('rejectionMessage', { message: identity.rejectionMessage })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">{isRejected ? t('resubmit') : t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">{t('documentType')}</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as IdentityDocumentType)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm">
            {Object.values(IdentityDocumentType).map((type) => (
              <option key={type} value={type}>
                {t(`documentTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{t('uploadFiles')}</label>
          <p className="text-muted-foreground mb-2 text-xs">{t('uploadDescription')}</p>
          <label className="hover:bg-muted flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors">
            <IconUpload className="text-muted-foreground mb-2 h-8 w-8" />
            <span className="text-muted-foreground text-sm">{t('uploadFiles')}</span>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="truncate text-sm">{entry.file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(entry.id)}
                  disabled={uploading}
                  className="text-muted-foreground hover:text-destructive ml-2 disabled:pointer-events-none disabled:opacity-50">
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showUploadProgress ? (
          <div className="bg-muted/50 space-y-2 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconLoader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
              <span className="min-w-0 flex-1">
                {t('uploadingFileOfTotal', {
                  current: uploadMeta.fileIndex + 1,
                  total: uploadMeta.total,
                })}
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {overallUploadPercent}%
              </span>
            </div>
            <Progress value={overallUploadPercent} className="h-2" />
          </div>
        ) : showSubmittingReview ? (
          <div
            className="bg-muted/50 flex items-center gap-2 rounded-lg border p-4 text-sm font-medium"
            role="status"
            aria-live="polite">
            <IconLoader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
            <span>{t('submittingReview')}</span>
          </div>
        ) : null}

        <Button
          className="w-full"
          onClick={() => void handleSubmit()}
          disabled={files.length === 0 || uploading || submitMutation.isPending}>
          {uploading ? <IconLoader2 className="mx-auto h-5 w-5 animate-spin" /> : t('submit')}
        </Button>
      </div>
    </div>
  );
}
