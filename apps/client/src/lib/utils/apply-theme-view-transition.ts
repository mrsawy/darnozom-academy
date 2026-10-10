import type { RefObject } from 'react';

interface ApplyThemeViewTransitionOptions {
  duration: number;
  buttonRef: RefObject<HTMLElement | null>;
  /** When false, skip the circular clip-path animation (e.g. no visual theme flip). */
  runClipAnimation: boolean;
}

/**
 * Applies a theme update, optionally via the View Transitions API when supported.
 * Uses next-themes `setTheme` only — do not combine with manual `classList` / MutationObserver
 * or you risk feedback loops with ThemeProvider (especially on mobile WebKit).
 */
export async function applyThemeUpdateWithOptionalTransition(
  apply: () => void,
  options: ApplyThemeViewTransitionOptions
): Promise<void> {
  const { duration, buttonRef, runClipAnimation } = options;

  const runClip = () => {
    if (!runClipAnimation || !buttonRef.current) return;
    try {
      const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top)
      );

      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
        },
        {
          duration,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    } catch {
      /* pseudo-element animation not supported */
    }
  };

  const startVt =
    typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
      ? document.startViewTransition.bind(document)
      : undefined;

  if (!startVt) {
    try {
      apply();
    } catch {
      /* apply failed */
    }
    return;
  }

  try {
    const transition = startVt(apply);
    const ready =
      transition && typeof transition === 'object' && 'ready' in transition
        ? (transition as { ready?: Promise<unknown> }).ready
        : undefined;
    if (ready != null && typeof ready.then === 'function') {
      await ready.catch((): undefined => undefined);
    }
    runClip();
  } catch {
    try {
      apply();
    } catch {
      /* apply failed */
    }
  }
}
