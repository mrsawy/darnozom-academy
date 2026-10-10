'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/atoms/button';
import { AnimatedThemeToggler } from '../atoms/animated-theme-toggler';
import { applyThemeUpdateWithOptionalTransition } from '@/lib/utils/apply-theme-view-transition';

export function ModeToggle({ className }: { className?: string }) {
  return <AnimatedThemeToggler className={className} />;
}

interface ThemeTogglerProps extends React.ComponentPropsWithoutRef<'button'> {
  duration?: number;
}

export function ThemeToggler({ className, duration = 400, ...props }: ThemeTogglerProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const handleClick = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    const shouldBeDark = newTheme === 'dark';
    const willChange = isDark !== shouldBeDark;

    void applyThemeUpdateWithOptionalTransition(() => setTheme(newTheme), {
      duration,
      buttonRef,
      runClipAnimation: willChange,
    });
  }, [isDark, setTheme, duration]);

  const t = useTranslations('Theme');

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className={className} disabled aria-hidden {...props}>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      ref={buttonRef}
      onClick={handleClick}
      className={className}
      {...props}>
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">{t('toggleTheme')}</span>
    </Button>
  );
}
