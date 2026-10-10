'use client';

import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CourseUploadProgressProps {
  isUploadingMedia: boolean;
  mediaUploadPhase: 'thumbnail' | 'trailer' | null;
  uploadProgress: number;
  uploadError: string | null;
  onAbortUpload: () => void;
}

export function CourseUploadProgress({
  isUploadingMedia,
  mediaUploadPhase,
  uploadProgress,
  uploadError,
  onAbortUpload,
}: CourseUploadProgressProps) {
  const t = useTranslations('CourseForm');

  return (
    <>
      {isUploadingMedia ? (
        <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {mediaUploadPhase === 'trailer'
                ? t('upload.uploadingTrailer')
                : t('upload.uploadingThumbnail')}
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void onAbortUpload()}>
              <X className="mr-1 h-4 w-4" />
              {t('upload.cancelUpload')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={uploadProgress} className="h-2 flex-1" />
            <span className="text-muted-foreground shrink-0 text-xs">{uploadProgress}%</span>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('upload.doNotLeaveOrRefresh')}
          </p>
        </div>
      ) : null}
      {uploadError && !isUploadingMedia ? (
        <p className="text-destructive text-center text-sm">{uploadError}</p>
      ) : null}
    </>
  );
}
