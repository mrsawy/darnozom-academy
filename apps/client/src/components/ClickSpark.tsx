'use client';
import { useTheme } from 'next-themes';
import React, { useRef, useEffect, useCallback, useState } from 'react';

/** Class on any ancestor suppresses sparks for that subtree. */
export const NO_SPARK_CLASS = 'no-spark';

/**
 * Set this data attribute on a root (e.g. interactive regions) to suppress sparks for the whole subtree.
 * Collapsible sets it on the root; you can add it anywhere without touching ClickSpark.
 */
export const CLICK_SPARK_IGNORE_ATTR = 'data-no-click-spark';

const DEFAULT_SUPPRESS_SELECTOR = `[${CLICK_SPARK_IGNORE_ATTR}], .${NO_SPARK_CLASS}`;

function eventTargetToElement(target: EventTarget | null): Element | null {
  if (!target || !(target instanceof Node)) {
    return null;
  }
  if (target.nodeType === Node.ELEMENT_NODE) {
    return target as Element;
  }
  return target.parentElement;
}

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  extraScale?: number;
  children?: React.ReactNode;
  /** Extra CSS selectors (comma-separated OR). Clicks inside matching elements skip sparks. */
  suppressSelectors?: string[];
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

function ClickSpark({
  sparkColor: sparkColorProp = '#fff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1,
  children,
  suppressSelectors,
}: ClickSparkProps) {
  const { theme } = useTheme();
  const isDark = theme == 'dark';
  const sparkColorInitialState = sparkColorProp || (isDark ? '#fff' : '#000');
  const [sparkColor, setSparkColor] = useState(sparkColorInitialState);
  useEffect(() => {
    const isDark = theme == 'dark';
    const sparkColorInitialState = isDark ? '#fff' : '#000';
    setSparkColor(sparkColorInitialState);
  }, [theme]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const startTimeRef = useRef<number | null>(null);

  const suppressSelectorRef = useRef(DEFAULT_SUPPRESS_SELECTOR);
  suppressSelectorRef.current = [DEFAULT_SUPPRESS_SELECTOR, ...(suppressSelectors ?? [])]
    .filter(Boolean)
    .join(', ');

  const shouldSkipSpark = useCallback((element: Element | null): boolean => {
    if (!element) {
      return false;
    }
    try {
      return Boolean(element.closest(suppressSelectorRef.current));
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let resizeTimeout: NodeJS.Timeout;

    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect();
      // Use viewport dimensions as fallback if parent has no size
      const finalWidth = width > 0 ? width : window.innerWidth;
      const finalHeight = height > 0 ? height : window.innerHeight;
      if (canvas.width !== finalWidth || canvas.height !== finalHeight) {
        canvas.width = finalWidth;
        canvas.height = finalHeight;
      }
    };

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 100);
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(parent);

    resizeCanvas();

    return () => {
      ro.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, []);

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case 'linear': {
          return t;
        }
        case 'ease-in': {
          return t * t;
        }
        case 'ease-in-out': {
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
        default: {
          return t * (2 - t);
        }
      }
    },
    [easing]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = (timestamp: number) => {
      startTimeRef.current ??= timestamp;
      ctx?.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((spark: Spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) {
          return false;
        }

        const progress = elapsed / duration;
        const eased = easeFunc(progress);

        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        return true;
      });

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration, easeFunc, extraScale]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (shouldSkipSpark(eventTargetToElement(e.target))) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const now = performance.now();
    const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
      x,
      y,
      angle: (2 * Math.PI * i) / sparkCount,
      startTime: now,
    }));

    sparksRef.current.push(...newSparks);
  };

  // Also handle clicks on the document level to catch all clicks
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (shouldSkipSpark(eventTargetToElement(e.target))) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Always create sparks regardless of bounds check - canvas should cover viewport
      const now = performance.now();
      const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
        x: Math.max(0, Math.min(x, rect.width)),
        y: Math.max(0, Math.min(y, rect.height)),
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now,
      }));

      sparksRef.current.push(...newSparks);
    };

    // Use capture phase to catch clicks before they reach child elements
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [sparkCount, shouldSkipSpark]);

  return (
    <div
      className="relative min-h-screen w-full"
      onClick={handleClick}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      role="button"
      tabIndex={0}
      style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

export default ClickSpark;
