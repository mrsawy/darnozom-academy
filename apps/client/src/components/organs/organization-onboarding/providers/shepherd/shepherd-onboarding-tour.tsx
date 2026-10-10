'use client';

import 'shepherd.js/dist/css/shepherd.css';

import Shepherd, { type StepOptions, type Tour } from 'shepherd.js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';

import type { OnboardingTourProps } from '../../organization-onboarding.types';
import { getOrgOnboardingSteps } from '../../organization-onboarding.steps';

type ShepherdSidePlacement = 'left' | 'right';

async function waitForElement(selector: string, timeoutMs = 3000) {
  if (selector === 'body') return true;

  const start = Date.now();

  return await new Promise<boolean>((resolve) => {
    const tick = () => {
      if (document.querySelector(selector)) return resolve(true);
      if (Date.now() - start >= timeoutMs) return resolve(false);
      requestAnimationFrame(tick);
    };

    tick();
  });
}

function isSameRoute(pathname: string, route: string) {
  if (pathname === route) return true;
  if (pathname.startsWith(route + '/')) return true;
  return false;
}

export function ShepherdOnboardingTour({ run, setRun, onComplete, onSkip }: OnboardingTourProps) {
  const t = useTranslations('OrganizationOnboarding');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const router = useRouter();
  const pathname = usePathname();

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const steps = useMemo(() => {
    const defs = getOrgOnboardingSteps();

    return defs.map((def) => {
      const sidePlacement: ShepherdSidePlacement = isRtl ? 'left' : 'right';
      return {
        ...def,
        title: t(def.titleKey),
        text: t(def.contentKey),
        sidePlacement,
      };
    });
  }, [isRtl, t]);

  const tourRef = useRef<Tour | null>(null);
  const isCleaningUpRef = useRef(false);

  const destroyTour = useCallback(() => {
    isCleaningUpRef.current = true;

    const tour = tourRef.current;
    tourRef.current = null;

    if (!tour) return;

    void tour.cancel().catch(() => {
      // noop — tour may already be torn down
    });
  }, []);

  useEffect(() => {
    if (!run) {
      destroyTour();
      return;
    }

    let isDisposed = false;

    const showStepById = (tour: Tour, stepId: string) => {
      const step = tour.getById(stepId);
      if (step) {
        void step.show();
        return;
      }

      void tour.show(stepId);
    };

    const goToIndex = async (index: number) => {
      const tour = tourRef.current;
      if (!tour) return;
      if (index < 0 || index >= steps.length) return;

      const def = steps[index];
      const nextRoute = def.route;

      if (nextRoute && !isSameRoute(pathnameRef.current, nextRoute)) {
        router.push(nextRoute);
        await waitForElement(String(def.target), 3000);
      }

      if (isDisposed || isCleaningUpRef.current) return;

      if (def.target !== 'body' && !document.querySelector(String(def.target))) {
        // Mirror Joyride's TARGET_NOT_FOUND -> auto-advance.
        void goToIndex(index + 1);
        return;
      }

      try {
        showStepById(tour, def.id);
      } catch {
        void goToIndex(index + 1);
      }
    };

    void (async () => {
      if (isDisposed) return;

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        exitOnEsc: false,
        defaultStepOptions: {
          scrollTo: true,
          cancelIcon: { enabled: false },
        },
      });

      tourRef.current = tour;
      isCleaningUpRef.current = false;

      tour.on('cancel', () => {
        if (isDisposed || isCleaningUpRef.current) return;
        setRun(false);
        onSkip();
      });

      tour.on('complete', () => {
        if (isDisposed || isCleaningUpRef.current) return;
        setRun(false);
        onComplete();
      });

      steps.forEach((def, index) => {
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;

        const buttons = [
          isFirst
            ? null
            : {
                text: t('back'),
                action: () => {
                  void goToIndex(index - 1);
                },
              },
          {
            text: isLast ? t('done') : t('next'),
            action: () => {
              if (isLast) {
                tour.complete();
                return;
              }

              void goToIndex(index + 1);
            },
          },
          {
            text: t('skip'),
            action: () => {
              void tour.cancel();
            },
          },
        ].filter((button): button is NonNullable<typeof button> => button !== null);

        const stepOptions: StepOptions = {
          id: def.id,
          title: def.title,
          text: def.text,
          buttons,
        };

        if (def.target !== 'body') {
          stepOptions.attachTo = { element: def.target, on: def.sidePlacement };
        }

        tour.addStep(stepOptions);
      });

      try {
        await tour.start();
      } catch {
        // noop
      }

      void goToIndex(0);
    })();

    return () => {
      isDisposed = true;
      destroyTour();
    };
  }, [destroyTour, onComplete, onSkip, router, run, setRun, steps, t]);

  // Shepherd renders imperatively; this component doesn't need to render DOM.
  return null;
}
