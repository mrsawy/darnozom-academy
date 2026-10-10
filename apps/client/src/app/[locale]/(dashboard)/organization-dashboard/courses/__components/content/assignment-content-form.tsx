'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { DateTimePicker } from '@/components/molecules/date-input/date-time-picker';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { FileCheck, Trash2 } from 'lucide-react';
import {
  Controller,
  type Control,
  type UseFormSetValue,
  type UseFormRegister,
  FieldErrors,
} from 'react-hook-form';
import { useTranslations } from 'next-intl';
import type { CourseContentFormData } from '@/lib/schema/content.schema';
import { cn } from '@/lib/utils';
import { getFileUrl } from '@/lib/actions/file/getPreSignedUrl';
import FileViewer from '@/components/molecules/file-viewer/fileViewer';

interface AssignmentContentErrors {
  dueDate?: { message?: string };
  maxPoints?: { message?: string };
  instructions?: { message?: string };
}

interface AssignmentContentFormProps {
  register: UseFormRegister<CourseContentFormData>;
  control: Control<CourseContentFormData>;
  setValue: UseFormSetValue<CourseContentFormData>;
  errors: FieldErrors<CourseContentFormData>;
  onTemplateFileChange: (file: File | null) => void;
  /** When editing, call with the existing file key so parent can delete it from S3 on save. */
  onTemplateFileRemoved?: (existingFileKey: string) => void;
  /** When editing, the existing template file key (to show preview). */
  initialFileKey?: string;
  mode?: 'create' | 'edit';
}

const TEMPLATE_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
} as const;

function mimeTypeFromFileKey(fileKey: string): string {
  // Strip query/hash so signed URLs (.../file.pdf?Expires=...) still match by extension.
  const pathOnly = fileKey.split('?')[0].split('#')[0];
  const lower = pathOnly.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return '';
}

export default function AssignmentContentForm({
  register,
  control,
  setValue,
  errors,
  onTemplateFileChange,
  onTemplateFileRemoved,
  initialFileKey,
  mode = 'create',
}: AssignmentContentFormProps) {
  const t = useTranslations('CreateContentForm');
  const [templateFiles, setTemplateFiles] = useState<File[] | undefined>();
  /** Preview URL for both image and PDF (for the dedicated preview section / FileViewer). */
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | undefined>();
  /** When user removes the existing template in edit mode, we stop showing its preview. */
  const [removedFileKey, setRemovedFileKey] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const contentErrors = errors?.content as AssignmentContentErrors | undefined;

  // When editing, load preview URL from existing fileKey (skip if user removed it)
  useEffect(() => {
    if (mode !== 'edit' || !initialFileKey?.trim() || removedFileKey === initialFileKey) return;
    let cancelled = false;
    void (async () => {
      try {
        const url = await getFileUrl({ fileKey: initialFileKey });
        if (cancelled || !url || typeof url !== 'string') return;
        setTemplatePreviewUrl(url);
      } catch {
        if (!cancelled) {
          setTemplatePreviewUrl(undefined);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, initialFileKey, removedFileKey]);

  const handleTemplateDrop = (files: File[]) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (files.length > 0) {
      const file = files[0];
      setTemplateFiles(files);
      onTemplateFileChange(file);
      setValue('content.fileSizeBytes', file.size);
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setTemplatePreviewUrl(objectUrl);
    } else {
      setTemplateFiles(undefined);
      setTemplatePreviewUrl(undefined);
      onTemplateFileChange(null);
      setValue('content.fileKey', '');
      setValue('content.fileSizeBytes', undefined);
    }
  };

  const handleRemoveTemplateFile = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setTemplateFiles(undefined);
    setTemplatePreviewUrl(undefined);
    onTemplateFileChange(null);
    setValue('content.fileKey', '');
    setValue('content.fileSizeBytes', undefined);
    if (mode === 'edit' && initialFileKey?.trim()) {
      setRemovedFileKey(initialFileKey);
      onTemplateFileRemoved?.(initialFileKey);
    }
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const hasTemplatePreview =
    (templateFiles?.length && templateFiles[0]) ??
    (templatePreviewUrl && (mode !== 'edit' || removedFileKey !== initialFileKey));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileCheck className="mr-2 h-5 w-5" />
          {t('assignmentContent.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Controller
              control={control}
              name="content.dueDate"
              render={({ field }) => (
                <DateTimePicker
                  id="assignment-due-date"
                  value={field.value}
                  onChange={field.onChange}
                  dateLabel={t('assignmentContent.dueDate')}
                  timeLabel={null}
                  error={contentErrors?.dueDate ?? null}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('assignmentContent.maxPoints')}</span>
            <Input
              type="number"
              min={1}
              max={1000}
              aria-invalid={!!contentErrors?.maxPoints}
              className={cn(contentErrors?.maxPoints && 'border-destructive')}
              {...register('content.maxPoints')}
            />
            {contentErrors?.maxPoints?.message ? (
              <p className="text-destructive text-sm">{contentErrors.maxPoints.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('assignmentContent.instructions')}</span>
            <Textarea
              rows={5}
              {...register('content.instructions')}
              placeholder={t('assignmentContent.instructionsPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('assignmentContent.templateFile')}</span>
              {(templateFiles?.length ?? 0) > 0 ||
              (mode === 'edit' && initialFileKey?.trim() && removedFileKey !== initialFileKey) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleRemoveTemplateFile}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  {t('assignmentContent.removeTemplateFile')}
                </Button>
              ) : null}
            </div>
            <DropzoneWithPreview
              files={templateFiles}
              handleDrop={handleTemplateDrop}
              // filePreview={templatePreview}
              accept={TEMPLATE_ACCEPT}
              maxFiles={1}
              className="min-h-[120px]"
            />
            {hasTemplatePreview ? (
              <div className="space-y-2">
                <FileViewer
                  file={templateFiles?.[0]}
                  url={templatePreviewUrl}
                  mimeType={
                    templateFiles?.[0]?.type ??
                    (initialFileKey ? mimeTypeFromFileKey(initialFileKey) : undefined)
                  }
                  fileName={
                    templateFiles?.[0]?.name ??
                    initialFileKey?.split('/').pop() ??
                    t('assignmentContentForm.defaultFileName')
                  }
                  previewLabel={t('assignmentContent.templatePreview')}
                  previewNotAvailableLabel={t('assignmentContent.previewNotAvailable')}
                  className="bg-muted/30 rounded-md border"
                />
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
