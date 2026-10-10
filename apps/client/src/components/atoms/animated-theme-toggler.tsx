'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { Button } from './button';
import { applyThemeUpdateWithOptionalTransition } from '@/lib/utils/apply-theme-view-transition';

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<'button'> {
  duration?: number;
}

export function AnimatedThemeToggler({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const applyThemeWithAnimation = useCallback(
    async (newTheme: 'light' | 'dark' | 'system') => {
      const isSystemDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = newTheme === 'dark' || (newTheme === 'system' && isSystemDark);
      const willChange = isDark !== shouldBeDark;

      if (!willChange && theme === newTheme) return;

      await applyThemeUpdateWithOptionalTransition(() => setTheme(newTheme), {
        duration,
        buttonRef,
        runClipAnimation: willChange,
      });
    },
    [isDark, duration, theme, setTheme]
  );

  const handleThemeChange = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      void applyThemeWithAnimation(newTheme);
    },
    [applyThemeWithAnimation]
  );

  const t = useTranslations('Theme');

  if (!mounted) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild className={className}>
          <Button variant="outline" size="icon" disabled aria-hidden {...props}>
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>{t('light')}</DropdownMenuItem>
          <DropdownMenuItem disabled>{t('dark')}</DropdownMenuItem>
          <DropdownMenuItem disabled>{t('system')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <Button variant="outline" size="icon" ref={buttonRef} {...props}>
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">{t('toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>{t('light')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>{t('dark')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('system')}>
          {t('system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
