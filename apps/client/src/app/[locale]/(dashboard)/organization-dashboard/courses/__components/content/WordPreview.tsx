'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import BasicLoader from '@/components/atoms/basic-loader';

interface WordPreviewProps {
  file: File;
  className?: string;
}

/**
 * Renders a DOCX file using docx-preview (proper formatting, images, styles).
 * Only .docx is supported.
 */
export default function WordPreview({ file, className }: WordPreviewProps) {
  const t = useTranslations('CreateContentForm');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (globalThis.window === undefined) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    el.innerHTML = '';

    const run = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const container = containerRef.current;
        if (cancelled || !container?.isConnected) return;
        await renderAsync(arrayBuffer, container, undefined, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('attachmentContent.previewError'));
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [file, t]);

  if (error) {
    return (
      <div className={className} role="alert">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ maxHeight: 400, overflow: 'auto' }}>
      {loading ? (
        <div style={{ minHeight: 200 }} role="status" aria-label={t('attachmentContent.loading')}>
          <BasicLoader />
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="rounded-md border bg-white p-4 dark:bg-zinc-900"
        data-testid="docx-preview-container"
        style={loading ? { display: 'none' } : undefined}
      />
    </div>
  );
}
