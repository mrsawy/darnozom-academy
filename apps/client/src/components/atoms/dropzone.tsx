'use client';

import { UploadIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { DropEvent, DropzoneOptions, FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

interface DropzoneContextType {
  src?: File[];
  accept?: DropzoneOptions['accept'];
  maxSize?: DropzoneOptions['maxSize'];
  minSize?: DropzoneOptions['minSize'];
  maxFiles?: DropzoneOptions['maxFiles'];
}

const renderBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined);

export type DropzoneProps = Omit<DropzoneOptions, 'onDrop'> & {
  src?: File[];
  className?: string;
  onDrop?: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => void;
  children?: ReactNode;
};

export function Dropzone({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
  ...props
}: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    maxSize,
    minSize,
    onError,
    disabled,
    onDrop: (acceptedFiles, fileRejections, event) => {
      if (fileRejections.length > 0) {
        const message = fileRejections.at(0)?.errors.at(0)?.message;
        onError?.(new Error(message));
        return;
      }

      onDrop?.(acceptedFiles, fileRejections, event);
    },
    ...props,
  });

  return (
    <DropzoneContext.Provider
      key={JSON.stringify(src)}
      value={{ src, accept, maxSize, minSize, maxFiles }}>
      <Button
        className={cn(
          'relative h-auto w-full flex-col overflow-hidden p-8',
          isDragActive && 'ring-ring ring-1 outline-none',
          className
        )}
        disabled={disabled}
        type="button"
        variant="outline"
        {...getRootProps()}>
        <input {...getInputProps()} disabled={disabled} />
        {children}
      </Button>
    </DropzoneContext.Provider>
  );
}

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);

  if (!context) {
    throw new Error('useDropzoneContext must be used within a Dropzone');
  }

  return context;
};

export interface DropzoneContentProps {
  children?: ReactNode;
  className?: string;
}

const maxLabelItems = 3;

export function DropzoneContent({ children, className }: DropzoneContentProps) {
  const t = useTranslations('CreateContentForm.Dropzone');
  const locale = useLocale();
  const { src } = useDropzoneContext();

  if (!src) {
    return null;
  }

  if (children) {
    return children;
  }

  const fileNames =
    src.length > maxLabelItems
      ? `${new Intl.ListFormat(locale).format(src.slice(0, maxLabelItems).map((file) => file.name))} ${t('andMore', { count: src.length - maxLabelItems })}`
      : new Intl.ListFormat(locale).format(src.map((file) => file.name));

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-sm font-medium">{fileNames}</p>
      <p className="text-muted-foreground w-full text-xs text-wrap">
        {t('dragAndDropOrClickReplace')}
      </p>
    </div>
  );
}

export interface DropzoneEmptyStateProps {
  children?: ReactNode;
  className?: string;
}

export function DropzoneEmptyState({ children, className }: DropzoneEmptyStateProps) {
  const t = useTranslations('CreateContentForm.Dropzone');
  const locale = useLocale();
  const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext();

  if (src) {
    return null;
  }

  if (children) {
    return children;
  }

  let caption = '';

  if (accept) {
    caption += `${t('accepts')} `;
    caption += new Intl.ListFormat(locale).format(Object.keys(accept));
  }

  if (minSize && maxSize) {
    caption += ` ${t('between')} ${renderBytes(minSize)} ${t('and')} ${renderBytes(maxSize)}`;
  } else if (minSize) {
    caption += ` ${t('atLeast')} ${renderBytes(minSize)}`;
  } else if (maxSize) {
    caption += ` ${t('lessThan')} ${renderBytes(maxSize)}`;
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-sm font-medium text-wrap">
        {maxFiles === 1 ? t('uploadFile') : t('uploadFiles')}
      </p>
      <p className="text-muted-foreground w-full truncate text-xs text-wrap">
        {t('dragAndDropOrClick')}
      </p>
      {caption ? <p className="text-muted-foreground text-xs text-wrap">{caption}.</p> : null}
    </div>
  );
}
