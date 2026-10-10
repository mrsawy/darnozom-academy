'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Button } from '@/components/atoms/button';
import FileViewer from '@/components/molecules/file-viewer/fileViewer';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { Paperclip, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useEffect, useMemo, useState, useRef } from 'react';
import { getFileUrl } from '@/lib/actions/file/getPreSignedUrl';

const MAX_ATTACHMENT_MB = 30;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;

const ATTACHMENT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Word
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  // PowerPoint
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  // Excel
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  // Windows often reports Office 2007+ formats (ZIP-based) as application/zip
  'application/zip': ['.pptx', '.docx', '.xlsx'],
};

// function isImage(file: File) {
//   return file.type.startsWith('image/');
// }

function isPdfMime(mimeType: string) {
  return mimeType === 'application/pdf';
}
function isImageMime(mimeType: string) {
  return mimeType.startsWith('image/');
}
function isWordDocxMime(mimeType: string) {
  return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
function isExcelMime(mimeType: string) {
  return (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
function isPowerPointMime(mimeType: string) {
  return (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
}

function getFileNameFromKey(fileKey: string, mimeType: string): string {
  const segment = fileKey.split('/').pop() ?? '';
  const hasExt = /\.[a-z0-9]+$/i.test(segment);
  if (hasExt) return segment;
  const ext =
    mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ? 'docx'
        : mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ? 'xlsx'
          : mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ? 'pptx'
            : 'file';
  return `attachment.${ext}`;
}

interface AttachmentContentFormProps {
  attachmentFile: File | null;
  onFileChange: (file: File | null) => void;
  /** When editing, show preview from existing file. */
  initialFileKey?: string;
  initialMimeType?: string;
  mode?: 'create' | 'edit';
  /** When user removes the existing file in edit mode. */
  onFileRemoved?: (existingFileKey: string) => void;
}

export default function AttachmentContentForm({
  attachmentFile,
  onFileChange,
  initialFileKey,
  initialMimeType = '',
  mode = 'create',
  onFileRemoved,
}: AttachmentContentFormProps) {
  const t = useTranslations('CreateContentForm');
  const [removedExistingKey, setRemovedExistingKey] = useState<string | null>(null);
  /** Preview URL for existing file (from getFileUrl). */
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | undefined>();
  /** For docx/xlsx/pptx we fetch blob and create a File for preview components. */
  const [existingFileForPreview, setExistingFileForPreview] = useState<File | null>(null);
  /** Type of existing preview: 'pdf' | 'image' | 'word' | 'excel' | 'ppt' | 'other' */
  const [existingPreviewType, setExistingPreviewType] = useState<
    'pdf' | 'image' | 'word' | 'excel' | 'ppt' | 'other' | undefined
  >();
  const objectUrlRef = useRef<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!attachmentFile) return;
    return URL.createObjectURL(attachmentFile);
  }, [attachmentFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load existing file preview when in edit mode with initialFileKey (and user has not removed it)
  useEffect(() => {
    if (mode !== 'edit' || !initialFileKey?.trim() || removedExistingKey === initialFileKey) {
      setExistingPreviewUrl(undefined);
      setExistingFileForPreview(null);
      setExistingPreviewType(undefined);
      return;
    }
    let cancelled = false;
    const mime = (initialMimeType || '').trim() || 'application/octet-stream';
    const fileName = getFileNameFromKey(initialFileKey, mime);

    void (async () => {
      try {
        const url = (await getFileUrl({ fileKey: initialFileKey })) as string | undefined;
        if (cancelled || !url || typeof url !== 'string') return;

        if (isPdfMime(mime)) {
          setExistingPreviewUrl(url);
          setExistingPreviewType('pdf');
          return;
        }
        if (isImageMime(mime)) {
          setExistingPreviewUrl(url);
          setExistingPreviewType('image');
          return;
        }
        if (isWordDocxMime(mime) || isExcelMime(mime) || isPowerPointMime(mime)) {
          const res = await fetch(url);
          if (cancelled) return;
          const blob = await res.blob();
          if (cancelled) return;
          const file = new File([blob], fileName, { type: mime });
          setExistingPreviewUrl(url);
          setExistingFileForPreview(file);
          setExistingPreviewType(
            isWordDocxMime(mime) ? 'word' : isExcelMime(mime) ? 'excel' : 'ppt'
          );
          return;
        }
        setExistingPreviewUrl(undefined);
        setExistingFileForPreview(null);
        setExistingPreviewType('other');
      } catch {
        if (!cancelled) {
          setExistingPreviewUrl(undefined);
          setExistingFileForPreview(null);
          setExistingPreviewType(undefined);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, initialFileKey, initialMimeType, removedExistingKey]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleRemoveFile = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    onFileChange(null);
    setExistingPreviewUrl(undefined);
    setExistingFileForPreview(null);
    setExistingPreviewType(undefined);
    if (mode === 'edit' && initialFileKey?.trim()) {
      setRemovedExistingKey(initialFileKey);
      onFileRemoved?.(initialFileKey);
    }
  };

  const hasFile =
    attachmentFile != null ||
    (mode === 'edit' && initialFileKey?.trim() && removedExistingKey !== initialFileKey);
  const showPreviewFromNewFile = attachmentFile && previewUrl;
  const showPreviewFromExisting =
    !attachmentFile &&
    existingPreviewUrl &&
    (existingPreviewType === 'pdf' || existingPreviewType === 'image');
  const showPreviewFromExistingOffice =
    !attachmentFile &&
    existingFileForPreview &&
    (existingPreviewType === 'word' ||
      existingPreviewType === 'excel' ||
      existingPreviewType === 'ppt');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Paperclip className="mr-2 h-5 w-5" />
          {t('attachmentContent.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('attachmentContent.file')}</span>
            {hasFile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemoveFile}>
                <Trash2 className="mr-1 h-4 w-4" />
                {t('attachmentContent.removeFile')}
              </Button>
            ) : null}
          </div>
          <DropzoneWithPreview
            files={attachmentFile ? [attachmentFile] : undefined}
            handleDrop={(files) => onFileChange(files[0] ?? null)}
            // filePreview={filePreviewForDropzone}
            accept={ATTACHMENT_ACCEPT}
            maxFiles={1}
            maxSize={MAX_ATTACHMENT_BYTES}
            onError={() =>
              toast.error(
                t('attachmentContent.fileSizeTooLarge', {
                  max: MAX_ATTACHMENT_MB,
                })
              )
            }
            className="min-h-[120px] w-full"
          />
        </div>

        {showPreviewFromNewFile ? (
          <FileViewer
            file={attachmentFile}
            url={previewUrl}
            previewLabel={t('attachmentContent.preview')}
            previewNotAvailableLabel={t('attachmentContent.previewNotAvailable')}
          />
        ) : null}

        {showPreviewFromExisting ? (
          <FileViewer
            url={existingPreviewUrl}
            mimeType={
              initialMimeType || (existingPreviewType === 'pdf' ? 'application/pdf' : 'image/png')
            }
            previewLabel={t('attachmentContent.preview')}
            previewNotAvailableLabel={t('attachmentContent.previewNotAvailable')}
          />
        ) : null}

        {showPreviewFromExistingOffice && existingFileForPreview ? (
          <FileViewer
            file={existingFileForPreview}
            previewLabel={t('attachmentContent.preview')}
            previewNotAvailableLabel={t('attachmentContent.previewNotAvailable')}
          />
        ) : null}

        {!attachmentFile && existingPreviewType === 'other' ? (
          <FileViewer
            url={existingPreviewUrl ?? undefined}
            mimeType={initialMimeType || 'application/octet-stream'}
            fileName={
              initialFileKey ? getFileNameFromKey(initialFileKey, initialMimeType || '') : undefined
            }
            previewNotAvailableLabel={t('attachmentContent.previewNotAvailable')}
            showPreviewLabel={false}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
