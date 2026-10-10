'use client';

import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { Save, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface FormHeaderProps {
  isUploading: boolean;
  progress: number;
  uploadError: string | null;
  onSave: () => void;
  onCancelUpload: () => void;
}

export default function FormHeader({
  isUploading,
  progress,
  uploadError,
  onSave,
  onCancelUpload,
}: FormHeaderProps) {
  const t = useTranslations('CreateContentForm');
  return (
    <div className="dir-ltr border-b">
      <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', isUploading && 'pt-6 pb-10')}>
        <div className="flex h-16 flex-col justify-center gap-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button onClick={onSave} type="button" size="sm" disabled={isUploading}>
                <Save className="mr-2 h-4 w-4" />
                {t('saveContent')}
              </Button>
              {isUploading ? (
                <Button type="button" variant="destructive" size="sm" onClick={onCancelUpload}>
                  <X className="mr-1 h-4 w-4" />
                  {t('upload.cancelUpload')}
                </Button>
              ) : null}
            </div>
          </div>
          {isUploading ? (
            <>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-muted-foreground shrink-0 text-xs">{progress}%</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t('upload.doNotLeaveOrRefresh')}
              </p>
            </>
          ) : null}
          {uploadError && !isUploading ? (
            <p className="text-destructive text-sm">{uploadError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
