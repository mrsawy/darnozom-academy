'use client';

import { Button } from '@/components/atoms/button';
import { Maximize } from 'lucide-react';
import { forwardRef, useLayoutEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface QuizSessionProps {
  children: ReactNode;
  /** When false, fullscreen gate is not enforced (e.g. no timed quiz edge cases). */
  enforceFullscreen: boolean;
}

export const QuizSession = forwardRef<HTMLDivElement, QuizSessionProps>(function QuizSession(
  { children, enforceFullscreen },
  ref
) {
  const t = useTranslations('StudentCourses.quizContent');
  const [fullscreenOk, setFullscreenOk] = useState(false);

  useLayoutEffect(() => {
    if (!enforceFullscreen) {
      setFullscreenOk(true);
      return;
    }

    const sync = () => {
      const el = typeof ref === 'object' && ref?.current ? ref.current : null;
      setFullscreenOk(Boolean(el && document.fullscreenElement === el));
    };

    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [enforceFullscreen, ref]);

  const requestFs = () => {
    const el = typeof ref === 'object' && ref?.current ? ref.current : null;
    if (!el?.requestFullscreen) {
      return;
    }
    void el.requestFullscreen().catch(() => {
      // Handled via UI messaging elsewhere
    });
  };

  const showBlocker = enforceFullscreen && !fullscreenOk;

  return (
    <div
      ref={ref}
      className="bg-background relative mx-auto min-h-[50vh] max-w-4xl overflow-x-hidden overflow-y-auto">
      {showBlocker ? (
        <div className="bg-background/95 absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-center backdrop-blur-sm">
          <Maximize className="text-muted-foreground h-12 w-12" />
          <p className="max-w-md text-lg font-medium">{t('returnToFullscreen')}</p>
          <p className="text-muted-foreground max-w-md text-sm">{t('fullscreenCannotDisable')}</p>
          <Button type="button" size="lg" onClick={requestFs}>
            {t('enterFullscreenAgain')}
          </Button>
        </div>
      ) : null}
      <div className={showBlocker ? 'pointer-events-none opacity-40 select-none' : undefined}>
        {children}
      </div>
    </div>
  );
});
