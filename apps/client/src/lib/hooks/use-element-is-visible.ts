'use client';

import { useEffect, useState, type RefObject } from 'react';

interface UseElementIsVisibleOptions extends IntersectionObserverInit {
  once?: boolean;
}

export function useElementIsVisible<T extends Element>(
  ref: RefObject<T | null>,
  {
    once = true,
    root = null,
    rootMargin = '0px',
    threshold = 0.15,
  }: UseElementIsVisibleOptions = {}
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
          return;
        }

        if (!once) setIsVisible(false);
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [once, ref, root, rootMargin, threshold]);

  return isVisible;
}
