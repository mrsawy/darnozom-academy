'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/atoms/button';
import BasicLoader from '@/components/atoms/basic-loader';

type PPTXViewerClass = new (opts: { canvas: HTMLCanvasElement }) => {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  loadFile: (file: File) => Promise<void>;
  render: () => Promise<void>;
  previousSlide: (canvas: HTMLCanvasElement) => Promise<void>;
  nextSlide: (canvas: HTMLCanvasElement) => Promise<void>;
};

interface PptxPreviewProps {
  file: File;
  className?: string;
}

/**
 * Renders a PPTX file using pptxviewjs (Canvas-based slide viewer).
 * Supports .pptx; .ppt (legacy) may not work.
 * Uses dynamic import so pptxviewjs (browser-only) is never run during SSR.
 */
export default function PptxPreview({ file, className }: PptxPreviewProps) {
  const t = useTranslations('CreateContentForm');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<InstanceType<PPTXViewerClass> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [PPTXViewerClass, setPPTXViewerClass] = useState<PPTXViewerClass | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('pptxviewjs').then((m) => {
      if (!cancelled) setPPTXViewerClass(() => m.PPTXViewer as unknown as PPTXViewerClass);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAndRender = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !PPTXViewerClass) return;

    viewerRef.current = new PPTXViewerClass({ canvas });
    const viewer = viewerRef.current;

    viewer.on('loadComplete', (...args: unknown[]) => {
      const data = args[0] as { slideCount?: number } | undefined;
      setTotalSlides(data?.slideCount ?? 0);
      setCurrentSlide(0);
    });
    viewer.on('slideChanged', (...args: unknown[]) => {
      setCurrentSlide((args[0] as number) ?? 0);
    });

    try {
      await viewer.loadFile(file);
      await viewer.render();
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('attachmentContent.previewError'));
      setLoading(false);
    }
  }, [file, t, PPTXViewerClass]);

  useEffect(() => {
    if (!PPTXViewerClass) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    setTotalSlides(0);
    setCurrentSlide(0);

    void loadAndRender().then(() => {
      if (cancelled) viewerRef.current = null;
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
    };
  }, [loadAndRender, PPTXViewerClass]);

  const goPrev = useCallback(async () => {
    const viewer = viewerRef.current;
    const canvas = canvasRef.current;
    if (!viewer || !canvas || currentSlide <= 0) return;
    await viewer.previousSlide(canvas);
  }, [currentSlide]);

  const goNext = useCallback(async () => {
    const viewer = viewerRef.current;
    const canvas = canvasRef.current;
    if (!viewer || !canvas || currentSlide >= totalSlides - 1) return;
    await viewer.nextSlide(canvas);
  }, [currentSlide, totalSlides]);

  if (error) {
    return (
      <div className={className} role="alert">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {loading ? (
        <div
          className="bg-muted/30 flex min-h-[280px] items-center justify-center rounded-md border border-dashed"
          role="status"
          aria-label={t('attachmentContent.loading')}>
          <BasicLoader />
        </div>
      ) : null}
      <div
        className="bg-muted/20 rounded-md border"
        style={loading ? { display: 'none' } : undefined}>
        <canvas
          ref={canvasRef}
          className="m-auto block w-full"
          style={{ maxHeight: 400, objectFit: 'contain' }}
        />
      </div>
      {!loading && totalSlides > 1 ? (
        <div className="dir-ltr mt-2 flex items-center justify-center gap-2">
          <Button type="button" onClick={() => void goPrev()} disabled={currentSlide <= 0}>
            ← {t('attachmentContent.previous')}
          </Button>
          <span className="text-muted-foreground text-sm">
            {currentSlide + 1} / {totalSlides}
          </span>
          <Button
            type="button"
            onClick={() => void goNext()}
            disabled={currentSlide >= totalSlides - 1}>
            {t('attachmentContent.next')} →
          </Button>
        </div>
      ) : null}
    </div>
  );
}
