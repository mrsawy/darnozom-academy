'use client';

import { motion, useReducedMotion } from 'motion/react';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/atoms/button';
import useLogout from '@/lib/utils/auth/logout';

/** Smooth deceleration (ease-out expo-ish) */
const easeOut = [0.16, 1, 0.3, 1] as const;

export function OnboardingPageShell({ children }: { children: React.ReactNode }) {
  const { handleLogout } = useLogout();
  const t = useTranslations('onboarding');
  const reduceMotion = useReducedMotion();

  return (
    <div className="bg-background relative flex min-h-svh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute top-[min(32vh,260px)] left-1/2 h-[min(78vw,480px)] w-[min(78vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background:
              'radial-gradient(ellipse 76% 60% at 50% 50%, color-mix(in oklch, var(--primary) 38%, transparent) 0%, color-mix(in oklch, var(--primary) 12%, transparent) 55%, transparent 78%)',
          }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.05, ease: easeOut }}
        />
        <motion.div
          className="absolute top-[min(36vh,300px)] left-1/2 h-[min(92vw,620px)] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[72px] dark:opacity-45"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--primary) 32%, transparent) 0%, transparent 70%)',
          }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 1.2, delay: 0.08, ease: easeOut }
          }
        />
      </div>

      <motion.header
        className="relative z-10 flex justify-center pt-6 md:pt-8"
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                type: 'spring',
                stiffness: 420,
                damping: 32,
                mass: 0.85,
                delay: 0.2,
              }
        }>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-2"
          onClick={() => void handleLogout()}>
          <LogOut className="size-4 shrink-0" aria-hidden />
          <span>{t('logout')}</span>
        </Button>
      </motion.header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-2 pb-12 md:px-10">
        <motion.div
          className="w-full max-w-lg"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  stiffness: 190,
                  damping: 28,
                  mass: 0.2,
                  delay: 0.38,
                }
          }>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
