'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, X, FileText, Image as ImageIcon, FileType } from 'lucide-react';
import {
  AI_ATTACHMENT_ALLOWED_MIME,
  AI_ATTACHMENT_IMAGE_MIME,
  AI_ATTACHMENT_MAX_FILES,
  AI_ATTACHMENT_MAX_FILE_SIZE_BYTES,
  AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES,
  AI_ATTACHMENT_MIME_PDF,
} from '@lms-organization/shared-types';
import { Button } from '@/components/atoms/button';

// Both MIME and extension help Windows file pickers, which often
// filter only by extension and otherwise force users to "All files".
const AI_ATTACHMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'];
const acceptAttr = [...AI_ATTACHMENT_ALLOWED_MIME, ...AI_ATTACHMENT_EXTENSIONS].join(',');

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (mime: string) => (AI_ATTACHMENT_IMAGE_MIME as readonly string[]).includes(mime);
const isPdf = (mime: string) => mime === AI_ATTACHMENT_MIME_PDF;

interface AiAttachmentPickerProps {
  value: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  onValidationChange?: (hasError: boolean) => void;
}

export function AiAttachmentPicker({
  value,
  onChange,
  disabled,
  onValidationChange,
}: AiAttachmentPickerProps) {
  const t = useTranslations('AiAttachmentPicker');
  const inputRef = useRef<HTMLInputElement>(null);

  const totalBytes = useMemo(() => value.reduce((sum, f) => sum + f.size, 0), [value]);

  const errors = useMemo(() => {
    const out = new Map<string, string>();
    for (const file of value) {
      if (!(AI_ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(file.type)) {
        out.set(file.name, t('errors.badType'));
      } else if (file.size > AI_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
        out.set(
          file.name,
          t('errors.tooLarge', { max: formatBytes(AI_ATTACHMENT_MAX_FILE_SIZE_BYTES) })
        );
      }
    }
    return out;
  }, [value, t]);

  const totalError =
    value.length > AI_ATTACHMENT_MAX_FILES
      ? t('errors.tooMany', { max: AI_ATTACHMENT_MAX_FILES })
      : totalBytes > AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES
        ? t('errors.totalTooLarge', { max: formatBytes(AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES) })
        : '';

  const hasError = errors.size > 0 || totalError.length > 0;
  useEffect(() => {
    onValidationChange?.(hasError);
  }, [hasError, onValidationChange]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const merged = [...value];
      for (const f of incoming) {
        if (merged.length >= AI_ATTACHMENT_MAX_FILES) break;
        if (merged.some((m) => m.name === f.name && m.size === f.size)) continue;
        merged.push(f);
      }
      onChange(merged);
    },
    [value, onChange]
  );

  const removeAt = useCallback(
    (index: number) => onChange(value.filter((_, i) => i !== index)),
    [value, onChange]
  );

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptAttr}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{t('label')}</label>
        <span className="text-muted-foreground text-xs">
          {value.length}/{AI_ATTACHMENT_MAX_FILES} · {formatBytes(totalBytes)}/
          {formatBytes(AI_ATTACHMENT_MAX_TOTAL_SIZE_BYTES)}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(disabled) || value.length >= AI_ATTACHMENT_MAX_FILES}
        onClick={() => inputRef.current?.click()}
        className="w-full gap-2">
        <Paperclip className="h-4 w-4" />
        {t('addFiles')}
      </Button>

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((file, index) => {
            const Icon = isImage(file.type) ? ImageIcon : isPdf(file.type) ? FileType : FileText;
            const fileError = errors.get(file.name);
            return (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatBytes(file.size)}
                      {fileError ? (
                        <span className="text-destructive ms-2">{fileError}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  aria-label={t('remove')}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {totalError ? <p className="text-destructive text-xs">{totalError}</p> : null}
      <p className="text-muted-foreground text-xs">{t('hint')}</p>
    </div>
  );
}
