'use client';

import { FileText } from 'lucide-react';
import { useMemo, useEffect, useState, useRef, type ReactNode } from 'react';
import AssignmentPdfViewer from '@/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/AssignmentPdfViewer';
import ExcelPreview from '@/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/ExcelPreview';
import PptxPreview from '@/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/PptxPreview';
import WordPreview from '@/app/[locale]/(dashboard)/organization-dashboard/courses/__components/content/WordPreview';
import BasicLoader from '@/components/atoms/basic-loader';

function isPdf(mime: string) {
  return mime === 'application/pdf';
}
function isImage(mime: string) {
  return mime.startsWith('image/');
}
function isWordDocx(mime: string) {
  return mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
function isExcel(mime: string) {
  return (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
function isPowerPoint(mime: string) {
  return (
    mime === 'application/vnd.ms-powerpoint' ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
}
function isWordDoc(mime: string) {
  return mime === 'application/msword';
}

/** Map file extension to MIME type (e.g. when only extension is passed as mimeType). */
const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Derive file extension from URL path when mimeType is not provided. */
function getExtensionFromUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  try {
    const pathname = new URL(url, 'https://dummy').pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    return ext && ext.length <= 5 ? ext : undefined;
  } catch {
    return undefined;
  }
}

/** When browser reports Office 2007+ as application/zip (e.g. on Windows), derive type from extension. */
function getEffectiveMime(file: File | null | undefined, mimeTypeProp: string | undefined): string {
  const mime = (file?.type ?? mimeTypeProp ?? '').trim();
  const name = (file?.name ?? '').toLowerCase();
  // If mime looks like a file extension (no slash), normalize to full MIME type (e.g. "pdf" -> "application/pdf")
  const ext = mime.includes('/') ? '' : mime.toLowerCase();
  if (ext && EXTENSION_TO_MIME[ext]) return EXTENSION_TO_MIME[ext];
  if (mime === 'application/zip' || mime === 'application/octet-stream') {
    if (name.endsWith('.pptx'))
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if (name.endsWith('.docx'))
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (name.endsWith('.xlsx'))
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return mime || 'application/octet-stream';
}

function isOfficeByUrl(mime: string) {
  return isWordDocx(mime) || isExcel(mime) || isPowerPoint(mime);
}

function extensionForMime(mime: string): string {
  if (isWordDocx(mime)) return '.docx';
  if (isExcel(mime)) return '.xlsx';
  if (isPowerPoint(mime)) return '.pptx';
  return '';
}

export interface FileViewerProps {
  /** When you have a File (new upload or Office blob). */
  file?: File | null;
  /** URL for PDF or image (object URL or presigned URL). Required for pdf/image when no file, or pass for pdf/image to use this URL. */
  url?: string | null;
  /** MIME type. Used when file is not provided (e.g. remote file). */
  mimeType?: string;
  /** File name for fallback "preview not available". Defaults to file?.name when file is provided. */
  fileName?: string;
  /** Label above preview (e.g. "Preview"). Shown for non-image types when showPreviewLabel is true. */
  previewLabel?: ReactNode;
  /** Label for "preview not available" fallback. */
  previewNotAvailableLabel?: ReactNode;
  /** Whether to show the preview label for non-image. Default true. */
  showPreviewLabel?: boolean;
  className?: string;
}

/**
 * Renders a preview for a file or remote URL: PDF, image, Word, Excel, PowerPoint,
 * or a fallback when preview is not supported.
 */
export default function FileViewer({
  file = null,
  url = null,
  mimeType: mimeTypeProp,
  fileName: fileNameProp,
  previewLabel,
  previewNotAvailableLabel,
  showPreviewLabel = true,
  className,
}: FileViewerProps) {
  const mimeFromUrl = getExtensionFromUrl(url);
  const mimeType = getEffectiveMime(file, mimeTypeProp ?? mimeFromUrl);
  const fileName = file?.name ?? fileNameProp ?? 'file';

  const [fetchedFile, setFetchedFile] = useState<File | null>(null);
  const [officeUrlLoading, setOfficeUrlLoading] = useState(false);

  useEffect(() => {
    if (file || !url || !mimeType || !isOfficeByUrl(mimeType)) {
      setFetchedFile(null);
      setOfficeUrlLoading(false);
      return;
    }
    let cancelled = false;
    setOfficeUrlLoading(true);
    const ext = extensionForMime(mimeType);
    const name = fileName.includes('.') ? fileName : `${fileName}${ext}`;
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        setFetchedFile(new File([blob], name, { type: mimeType }));
      })
      .catch(() => {
        if (!cancelled) setFetchedFile(null);
      })
      .finally(() => {
        if (!cancelled) setOfficeUrlLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, mimeType, fileName, file]);

  const blobUrlRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const blobUrl = useMemo(() => {
    if (url || !file) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
        fileRef.current = null;
      }
      return null;
    }
    if (!isPdf(file.type) && !isImage(file.type)) return null;
    if (fileRef.current === file && blobUrlRef.current) return blobUrlRef.current;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    fileRef.current = file;
    const created = URL.createObjectURL(file);
    blobUrlRef.current = created;
    return created;
  }, [file, url]);

  // Do not revoke blob URL on unmount: React Strict Mode unmounts then remounts. If we revoke
  // on unmount, EmbedPDF's async fetch fails (ERR_FILE_NOT_FOUND). We only revoke when file/url
  // changes (in useMemo). One blob may leak per viewer when navigating away; that's acceptable.

  if (!file && !url && !mimeType) return null;

  const effectiveUrl = url ?? blobUrl;
  const isImageType = isImage(mimeType);
  const officeFile = file ?? fetchedFile;

  function FallbackBlock() {
    return (
      <div className="bg-muted/30 flex items-center gap-3 rounded-md border border-dashed p-4">
        <FileText className="text-muted-foreground h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{fileName}</p>
          {previewNotAvailableLabel ? (
            <p className="text-muted-foreground text-xs">{previewNotAvailableLabel}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const isLoadingOfficeFromUrl =
    !file && url && mimeType && isOfficeByUrl(mimeType) && officeUrlLoading && !fetchedFile;

  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      {showPreviewLabel && !isImageType && previewLabel ? (
        <span className="text-sm font-medium">{previewLabel}</span>
      ) : null}
      {isPdf(mimeType) && effectiveUrl ? (
        <AssignmentPdfViewer key={effectiveUrl} url={effectiveUrl} className="rounded-md border" />
      ) : isImageType && effectiveUrl ? (
        <div className="bg-muted/30 relative overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="max-h-[400px] w-full object-contain" src={effectiveUrl} />
        </div>
      ) : isLoadingOfficeFromUrl ? (
        <div className="bg-muted/30 flex items-center justify-center rounded-md border border-dashed p-8">
          <BasicLoader />
        </div>
      ) : isWordDocx(mimeType) && officeFile ? (
        <WordPreview file={officeFile} className="rounded-md border" />
      ) : isExcel(mimeType) && officeFile ? (
        <ExcelPreview file={officeFile} className="rounded-md border" />
      ) : isPowerPoint(mimeType) && officeFile && !fileName.toLowerCase().endsWith('.ppt') ? (
        <PptxPreview file={officeFile} className="rounded-md border" />
      ) : isWordDoc(mimeType) ||
        (isPowerPoint(mimeType) && fileName.toLowerCase().endsWith('.ppt')) ? (
        <FallbackBlock />
      ) : (
        <FallbackBlock />
      )}
    </div>
  );
}
