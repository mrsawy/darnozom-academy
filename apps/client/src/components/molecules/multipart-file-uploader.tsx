'use client';

import * as React from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { useMultipartUpload } from '@/lib/hooks/file/use-multipart-upload';
import { useTranslations } from 'next-intl';

interface MultipartFileUploaderProps {
  generateFileKey: (file: File) => string;
  isPublic?: boolean;
  accept?: string;
  onComplete?: (fileKey: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function MultipartFileUploader({
  generateFileKey,
  isPublic = false,
  accept,
  onComplete,
  onError,
  className,
}: MultipartFileUploaderProps) {
  const t = useTranslations('MultipartFileUploader');
  const { progress, status, error, upload, abort } = useMultipartUpload();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  }, []);

  const handleUpload = React.useCallback(async () => {
    if (!selectedFile) return;

    const key = generateFileKey(selectedFile);
    const resultKey = await upload(selectedFile, key, { isPublic });

    if (resultKey) {
      onComplete?.(resultKey);
    }
  }, [selectedFile, generateFileKey, isPublic, upload, onComplete]);

  React.useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleCancel = React.useCallback(async () => {
    await abort();
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [abort]);

  const isIdle = status === 'idle';
  const isUploading = status === 'uploading';
  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isActive = isUploading;

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {/* File picker */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isActive}
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground',
            'border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs',
            'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
      </div>

      {/* Selected file info */}
      {selectedFile ? (
        <p className="text-muted-foreground truncate text-xs">
          {selectedFile.name} — {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
        </p>
      ) : null}

      {/* Progress bar (visible during active upload or after completion/error) */}
      {isActive || isCompleted || isError ? (
        <div className="flex flex-col gap-1">
          <Progress value={progress} />
          <span className="text-muted-foreground text-xs">{progress}%</span>
        </div>
      ) : null}

      {/* Error message */}
      {isError && error ? <p className="text-destructive text-xs">{error}</p> : null}

      {/* Completed message */}
      {isCompleted ? <p className="text-success text-xs">{t('uploadComplete')}</p> : null}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Start button: shown when idle or error, file selected */}
        {(isIdle || isError) && selectedFile ? (
          <Button size="sm" onClick={() => void handleUpload()}>
            <Upload className="mr-1 h-4 w-4" />
            {t('upload')}
          </Button>
        ) : null}

        {/* Cancel button: shown while uploading or paused */}
        {isActive ? (
          <Button size="sm" variant="destructive" onClick={() => void handleCancel()}>
            <X className="mr-1 h-4 w-4" />
            {t('cancel')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
