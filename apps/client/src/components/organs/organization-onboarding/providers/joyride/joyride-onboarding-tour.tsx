'use client';

import { Joyride, ACTIONS, EVENTS, STATUS, type EventData, type Step } from 'react-joyride';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';

import type { OnboardingTourProps } from '../../organization-onboarding.types';
import { getOrgOnboardingSteps } from '../../organization-onboarding.steps';
import { JoyrideOnboardingTooltip } from './joyride-onboarding-tooltip';

const SPOTLIGHT_ACTIVE_CLASS = 'org-onboarding-spotlight-active';

async function waitForElement(selector: string, timeoutMs = 4000) {
  if (selector === 'body') return true;

  const start = Date.now();

  return await new Promise<boolean>((resolve) => {
    const tick = () => {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        return resolve(true);
      }
      if (Date.now() - start >= timeoutMs) return resolve(false);
      requestAnimationFrame(tick);
    };

    tick();
  });
}

function isExactRoute(pathname: string, route: string) {
  return pathname === route;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function clearSpotlightActive() {
  document.querySelectorAll(`.${SPOTLIGHT_ACTIVE_CLASS}`).forEach((el) => {
    el.classList.remove(SPOTLIGHT_ACTIVE_CLASS);
  });
}

/** Joyride `Step.target` may be a selector, element, ref, or getter — we only use CSS selectors. */
function stepTargetSelector(target: Step['target']): string | null {
  return typeof target === 'string' ? target : null;
}

export function JoyrideOnboardingTour({ run, setRun, onComplete, onSkip }: OnboardingTourProps) {
  const t = useTranslations('OrganizationOnboarding');
  const locale = useLocale();
  const isRtl = locale === 'ar' || locale.startsWith('ar-');

  const router = useRouter();
  const pathname = usePathname();

  const steps = useMemo(() => {
    const defs = getOrgOnboardingSteps();

    return defs.map((def): Step => {
      const isBody = def.target === 'body';
      const isHeaderCta = def.id === 'createUser' || def.id === 'createCourse';
      const navPlacement = isBody ? 'center' : isRtl ? 'left' : 'right';
      // Header CTA sits opposite the page title — align tooltip to that edge.
      const headerPlacement = isRtl ? 'bottom-start' : 'bottom-end';

      return {
        target: def.target,
        title: t(def.titleKey),
        content: t(def.contentKey),
        placement: isHeaderCta ? headerPlacement : def.placement === 'auto' ? 'auto' : navPlacement,
        skipBeacon: true,
        data: def.route ? { route: def.route } : undefined,
        buttons: ['back', 'primary', 'skip'],
        targetWaitTimeout: 6000,
        offset: isHeaderCta ? 14 : 12,
        spotlightPadding: def.spotlightPadding ?? (isBody ? 0 : 8),
        spotlightRadius: def.spotlightRadius ?? 8,
        scrollOffset: isHeaderCta ? 96 : 64,
        // Darker veil on CTA steps so the cutout reads louder.
        overlayColor: isHeaderCta
          ? 'color-mix(in oklab, var(--foreground) 72%, transparent)'
          : 'color-mix(in oklab, var(--foreground) 55%, transparent)',
        floatingOptions: {
          strategy: 'fixed',
          hideArrow: isBody,
          shiftOptions: { padding: 16 },
          flipOptions: { padding: 16 },
        },
        styles: isHeaderCta
          ? {
              spotlight: {
                stroke: 'var(--primary)',
                strokeWidth: 3,
              },
            }
          : undefined,
      };
    });
  }, [isRtl, t]);

  const [stepIndex, setStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const endedRef = useRef(false);

  const endTour = useCallback(
    (kind: 'complete' | 'skip') => {
      if (endedRef.current) return;
      endedRef.current = true;
      clearSpotlightActive();
      setRun(false);
      setIsNavigating(false);
      if (kind === 'skip') onSkip();
      else onComplete();
    },
    [onComplete, onSkip, setRun]
  );

  useEffect(() => {
    if (!run) {
      clearSpotlightActive();
      return;
    }
    endedRef.current = false;
    setStepIndex(0);
  }, [run]);

  // Pulse ring on the live target so the CTA “pops” through the overlay.
  useEffect(() => {
    clearSpotlightActive();
    if (!run || isNavigating) return;

    const step = steps[stepIndex];
    const target = step ? stepTargetSelector(step.target) : null;
    if (!target || target === 'body') return;

    const el = document.querySelector(target);
    if (!(el instanceof HTMLElement)) return;

    el.classList.add(SPOTLIGHT_ACTIVE_CLASS);
    return () => {
      el.classList.remove(SPOTLIGHT_ACTIVE_CLASS);
    };
  }, [run, isNavigating, stepIndex, steps, pathname]);

  // If the user opens a sub-route (e.g. /users/create), return to the list route for CTA steps.
  useEffect(() => {
    if (!run || isNavigating) return;

    const step = steps[stepIndex];
    const route = (step?.data as { route?: string } | undefined)?.route;
    if (!route || isExactRoute(pathname, route)) return;

    setIsNavigating(true);
    router.push(route);
    const target = stepTargetSelector(step.target) ?? 'body';
    void waitForElement(target, 6000).finally(() => {
      void wait(150).then(() => setIsNavigating(false));
    });
  }, [run, isNavigating, stepIndex, steps, pathname, router]);

  const goToStep = useCallback(
    async (nextIndex: number) => {
      if (nextIndex < 0) return;

      // Past the last step → finish (controlled mode never auto-fires FINISHED unless index advances).
      if (nextIndex >= steps.length) {
        endTour('complete');
        return;
      }

      const nextStep = steps[nextIndex];
      const nextRoute = (nextStep.data as { route?: string } | undefined)?.route;

      const nextTarget = stepTargetSelector(nextStep.target);

      if (nextRoute && !isExactRoute(pathname, nextRoute)) {
        setIsNavigating(true);
        router.push(nextRoute);
        const found = await waitForElement(nextTarget ?? 'body', 6000);
        await wait(found ? 150 : 300);
        setStepIndex(nextIndex);
        setIsNavigating(false);
        return;
      }

      if (nextTarget && nextTarget !== 'body') {
        await waitForElement(nextTarget, 6000);
        await wait(100);
      }

      setStepIndex(nextIndex);
    },
    [endTour, pathname, router, steps]
  );

  const onEvent = useCallback(
    (data: EventData) => {
      const { status, type, index, action, origin } = data;

      const isSkip =
        status === STATUS.SKIPPED || action === ACTIONS.SKIP || origin === 'button_skip';

      if (isSkip) {
        endTour('skip');
        return;
      }

      if (status === STATUS.FINISHED || type === EVENTS.TOUR_END) {
        endTour('complete');
        return;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        // Missing target on a required list page — advance rather than sticking forever.
        void goToStep(index + 1);
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
        void goToStep(nextIndex);
      }
    },
    [endTour, goToStep]
  );

  if (!run) return null;

  return (
    <Joyride
      onEvent={onEvent}
      continuous
      run={run ? !isNavigating : undefined}
      stepIndex={stepIndex}
      steps={steps}
      scrollToFirstStep
      tooltipComponent={JoyrideOnboardingTooltip}
      options={{
        overlayClickAction: false,
        // Progress is shown in the custom tooltip; avoid English "Next (n of m)" default.
        showProgress: false,
        // Theme tokens are already full colors (oklch). Do NOT wrap in hsl().
        primaryColor: 'var(--primary)',
        backgroundColor: 'var(--card)',
        textColor: 'var(--card-foreground)',
        overlayColor: 'color-mix(in oklab, var(--foreground) 55%, transparent)',
        zIndex: 10_000,
        buttons: ['back', 'primary', 'skip'],
      }}
      locale={{
        back: t('back'),
        close: t('done'),
        last: t('last'),
        next: t('next'),
        // Joyride substitutes {current}/{total} itself — must not pass through next-intl ICU.
        nextWithProgress: isRtl ? 'التالي ({current} من {total})' : 'Next ({current} of {total})',
        skip: t('skip'),
      }}
      styles={{
        overlay: {
          mixBlendMode: 'normal',
        },
        // Custom tooltip owns chrome; strip Joyride defaults that fought theme tokens.
        tooltip: {
          backgroundColor: 'transparent',
          padding: 0,
          borderRadius: 0,
        },
        tooltipContainer: {
          textAlign: 'start',
        },
        floater: {
          filter: 'none',
        },
      }}
    />
  );
}
