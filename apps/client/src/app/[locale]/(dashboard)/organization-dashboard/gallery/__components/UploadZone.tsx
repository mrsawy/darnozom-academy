'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { IconCloudUpload } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface UploadZoneProps {
  onDrop: (files: File[]) => void;
  uploading: boolean;
  progress: number;
}

export function UploadZone({ onDrop, uploading, progress }: UploadZoneProps) {
  const t = useTranslations('UploadZone');
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onDrop(acceptedFiles);
      }
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': [],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    multiple: false,
    disabled: uploading,
    onDropRejected: (fileRejections) => {
      for (const rejection of fileRejections) {
        for (const error of rejection.errors) {
          if (error.code === 'file-too-large') {
            toast.error(t('fileTooLarge'));
          } else if (error.code === 'file-invalid-type') {
            toast.error(t('invalidFileType'));
          } else {
            toast.error(error.message);
          }
        }
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200 ease-in-out ${uploading ? 'border-muted cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
        isDragActive && !uploading
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border bg-card/50 hover:border-primary/50 hover:bg-accent/50'
      } `}>
      <input {...getInputProps()} />
      <div className="bg-primary/10 mb-4 rounded-full p-4">
        <IconCloudUpload className="text-primary h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold">
        {isDragActive ? t('dropImageHere') : t('clickOrDragToUpload')}
      </h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('supportInfo')}</p>
      {uploading ? (
        <div className="bg-background/90 absolute inset-0 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{t('uploading')}</span>
              <span>{progress}%</span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
