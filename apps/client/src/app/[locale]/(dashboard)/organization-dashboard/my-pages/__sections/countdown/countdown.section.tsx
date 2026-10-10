'use client';

import { useEffect, useState } from 'react';
import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  selectField,
  textField,
  textareaField,
  linkField,
  colorFields,
  colorField,
} from '../utils';
import type { CountdownSectionProps } from './types';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const computeTimeLeft = (target: string): TimeLeft => {
  const diff = new Date(target).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
};

const CountdownSection = () => {
  function CountdownRuntime({
    title,
    subtitle,
    targetDate,
    ctaText,
    ctaLink,
    expiredMessage,
    style,
    backgroundColor,
    textColor,
    accentColor,
    styleProps,
  }: CountdownSectionProps & { styleProps: React.CSSProperties }) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(targetDate ?? ''));

    useEffect(() => {
      const interval = setInterval(() => {
        setTimeLeft(computeTimeLeft(targetDate ?? ''));
      }, 1000);
      return () => clearInterval(interval);
    }, [targetDate]);

    const items: [string, number][] = [
      ['Days', timeLeft.days],
      ['Hours', timeLeft.hours],
      ['Minutes', timeLeft.minutes],
      ['Seconds', timeLeft.seconds],
    ];

    const numberBlock = (value: number, label: string) => {
      if (style === 'minimal') {
        return (
          <div className="flex flex-col items-center px-4" key={label}>
            <span
              className="font-mono text-5xl leading-none font-extrabold tabular-nums md:text-7xl"
              style={{ color: accentColor }}>
              {String(value).padStart(2, '0')}
            </span>
            <span className="mt-2 text-xs font-bold tracking-widest uppercase opacity-60">
              {label}
            </span>
          </div>
        );
      }
      if (style === 'inline') {
        return (
          <span key={label} className="mx-1.5">
            <span
              className="font-mono text-3xl font-extrabold tabular-nums"
              style={{ color: accentColor }}>
              {String(value).padStart(2, '0')}
            </span>
            <span className="ml-1 text-xs font-bold uppercase opacity-60">{label.slice(0, 1)}</span>
          </span>
        );
      }
      // boxed
      return (
        <div key={label} className="flex flex-col items-center">
          <div
            className="flex min-w-[80px] flex-col items-center rounded-2xl p-5 shadow-2xl md:min-w-[120px] md:p-7"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
              color: '#ffffff',
            }}>
            <span className="font-mono text-4xl leading-none font-extrabold tabular-nums md:text-6xl">
              {String(value).padStart(2, '0')}
            </span>
          </div>
          <span className="mt-2 text-xs font-bold tracking-widest uppercase opacity-60">
            {label}
          </span>
        </div>
      );
    };

    return (
      <div
        className="relative overflow-hidden px-6 py-20 sm:px-10"
        style={{ ...styleProps, backgroundColor }}>
        {/* Background decoration */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative mx-auto max-w-4xl text-center" style={{ color: textColor }}>
          {title ? (
            <h2 className="mb-3 text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h2>
          ) : null}
          {subtitle ? <p className="mb-10 text-lg opacity-75">{subtitle}</p> : null}

          {timeLeft.expired ? (
            <p className="mb-8 text-2xl font-extrabold" style={{ color: accentColor }}>
              {expiredMessage}
            </p>
          ) : (
            <div
              className={
                style === 'inline'
                  ? 'mb-10 inline-flex flex-wrap items-baseline justify-center gap-2'
                  : 'mb-10 flex flex-wrap items-start justify-center gap-4 sm:gap-6'
              }>
              {items.map(([label, value], i) => (
                <div key={label} className="flex items-start">
                  {numberBlock(value, label)}
                  {style === 'boxed' && i < items.length - 1 && (
                    <span
                      className="mx-2 mt-4 text-3xl font-light opacity-30 md:text-5xl"
                      style={{ color: accentColor }}>
                      :
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {ctaText ? (
            <a
              href={ctaLink ?? '#'}
              className="inline-flex items-center gap-2 rounded-full px-10 py-4 font-extrabold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
              style={{ backgroundColor: accentColor }}>
              {ctaText} →
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      targetDate: {
        type: 'text' as const,
        label: 'Target date (ISO: 2026-12-31T23:59:59)',
      },
      ctaText: textField(true),
      ctaLink: linkField(),
      expiredMessage: textField(true),
      style: selectField([
        { label: 'Boxed (accent cards)', value: 'boxed' },
        { label: 'Minimal (numbers only)', value: 'minimal' },
        { label: 'Inline (compact row)', value: 'inline' },
      ]),
      ...colorFields,
      accentColor: colorField(),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Enrollment Closes In',
      subtitle: 'Secure your spot before registration ends',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19),
      ctaText: 'Enroll Now',
      ctaLink: '#',
      expiredMessage: 'Registration is now closed.',
      style: 'boxed',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#f59e0b',
    },
    render: (props: CountdownSectionProps) => {
      const styleProps = getStyleProps(props);
      return <CountdownRuntime {...props} styleProps={styleProps} />;
    },
  };
};

export default CountdownSection;
