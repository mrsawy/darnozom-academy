'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPluginRegistration } from '@embedpdf/core';
import { EmbedPDF } from '@embedpdf/core/react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import {
  DocumentContent,
  DocumentManagerPluginPackage,
} from '@embedpdf/plugin-document-manager/react';
import { ViewportPluginPackage, Viewport } from '@embedpdf/plugin-viewport/react';
import { ScrollPluginPackage, Scroller } from '@embedpdf/plugin-scroll/react';
import { RenderPluginPackage, RenderLayer } from '@embedpdf/plugin-render/react';

import { cn } from '@/lib/utils';
import BasicLoader from '@/components/atoms/basic-loader';

interface AssignmentPdfViewerProps {
  /** URL of the PDF to display (object URL or presigned URL). */
  url: string;
  className?: string;
}

/**
 * EmbedPDF loads PDFs via fetch(), which requires CORS on the file host.
 * Presigned CloudFront/S3 URLs typically omit Access-Control-Allow-Origin, so the browser blocks fetch.
 * Iframe navigation does not use that code path, so cross-origin HTTPS PDFs are shown in an iframe instead.
 */
function isCrossOriginHttpPdfUrl(url: string): boolean {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return false;
  if (globalThis.window === undefined) return false;
  try {
    const u = new URL(url, globalThis.location.href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return u.origin !== globalThis.location.origin;
  } catch {
    return false;
  }
}

function CrossOriginPdfIframe({ url, className }: AssignmentPdfViewerProps) {
  const t = useTranslations('AssignmentPdfViewer');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* eslint-disable-next-line react/iframe-missing-sandbox -- we are using a cross-origin PDF */}
      <iframe
        title={t('pdfPreview')}
        src={url}
        className="bg-muted/30 h-[400px] w-full rounded-md border"
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground text-xs underline">
        {t('openInNewTab')}
      </a>
    </div>
  );
}

function EmbedPdfViewerInner({ url, className }: AssignmentPdfViewerProps) {
  const t = useTranslations('AssignmentPdfViewer');
  const { engine, isLoading, error } = usePdfiumEngine();

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
    ],
    [url]
  );

  if (error) {
    return (
      <div className={className} role="alert">
        <p className="text-destructive text-sm">{t('failedToLoad')}</p>
      </div>
    );
  }

  if (isLoading || !engine) {
    return (
      <div
        className={cn(
          'bg-muted/30 flex min-h-[200px] items-center justify-center rounded-md border border-dashed',
          className
        )}>
        <BasicLoader />
      </div>
    );
  }

  return (
    <div className={className} style={{ height: '400px' }}>
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) =>
          activeDocumentId ? (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded }) =>
                isLoaded ? (
                  <Viewport
                    documentId={activeDocumentId}
                    style={{ backgroundColor: '#f1f3f5', height: '100%' }}>
                    <Scroller
                      documentId={activeDocumentId}
                      renderPage={({ width, height, pageIndex }) => (
                        <div style={{ width, height }}>
                          <RenderLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                        </div>
                      )}
                    />
                  </Viewport>
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">{t('loadingDocument')}</p>
                  </div>
                )
              }
            </DocumentContent>
          ) : null
        }
      </EmbedPDF>
    </div>
  );
}

/**
 * Scrollable PDF preview: EmbedPDF for same-origin / blob URLs; iframe for cross-origin HTTPS (e.g. CloudFront).
 */
export default function AssignmentPdfViewer({ url, className }: AssignmentPdfViewerProps) {
  const [useIframe, setUseIframe] = useState<boolean | null>(null);

  useEffect(() => {
    setUseIframe(isCrossOriginHttpPdfUrl(url));
  }, [url]);

  if (useIframe === null) {
    return (
      <div
        className={cn(
          'bg-muted/30 flex min-h-[200px] items-center justify-center rounded-md border border-dashed',
          className
        )}>
        <BasicLoader />
      </div>
    );
  }

  if (useIframe) {
    return <CrossOriginPdfIframe url={url} className={className} />;
  }

  return <EmbedPdfViewerInner url={url} className={className} />;
}
