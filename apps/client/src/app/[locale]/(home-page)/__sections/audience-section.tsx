'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Check, GraduationCap, Presentation, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_ICONS = [Building2, Presentation, GraduationCap, Users] as const;

/** Position of each orbiting node, expressed as percentages of the orbit box. */
const ORBIT_POSITIONS = [
  { left: '50%', top: '0%' },
  { left: '100%', top: '50%' },
  { left: '50%', top: '100%' },
  { left: '0%', top: '50%' },
] as const;

const ROLE_ACCENTS = [
  { dot: 'bg-primary', ring: 'ring-primary/40', glow: 'shadow-primary/30', text: 'text-primary' },
  { dot: 'bg-accent', ring: 'ring-accent/40', glow: 'shadow-accent/30', text: 'text-accent' },
  { dot: 'bg-success', ring: 'ring-success/40', glow: 'shadow-success/30', text: 'text-success' },
  { dot: 'bg-warning', ring: 'ring-warning/40', glow: 'shadow-warning/30', text: 'text-warning' },
] as const;

const AUTO_ROTATE_MS = 5000;
const ROLE_COUNT = ROLE_ICONS.length;

function AudienceSection() {
  const t = useTranslations('AudienceSection');
  // Monotonic counter rather than a plain index: the beam derives its angle from
  // it, so 3 -> 0 advances one quarter turn forward instead of unwinding 270deg.
  const [step, setStep] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const activeIndex = step % ROLE_COUNT;

  const roles = ROLE_ICONS.map((Icon, index) => ({
    Icon,
    accent: ROLE_ACCENTS[index],
    position: ORBIT_POSITIONS[index],
    label: t(`roles.${index}.label`),
    title: t(`roles.${index}.title`),
    tagline: t(`roles.${index}.tagline`),
    bullets: [0, 1, 2].map((bulletIndex) => t(`roles.${index}.bullets.${bulletIndex}`)),
  }));

  useEffect(() => {
    if (isPinned) return;
    const timer = globalThis.setInterval(() => {
      setStep((current) => current + 1);
    }, AUTO_ROTATE_MS);
    return () => globalThis.clearInterval(timer);
  }, [isPinned]);

  /** Always walks forward to the requested role so the beam never spins backwards. */
  const selectRole = useCallback((index: number) => {
    setStep((current) => current + ((index - (current % ROLE_COUNT) + ROLE_COUNT) % ROLE_COUNT));
    setIsPinned(true);
  }, []);

  const activeRole = roles[activeIndex];

  return (
    <section id="built-for" className="bg-background/20 relative overflow-hidden py-20 md:py-28">
      {/* Ambient background */}
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute start-1/4 -top-40 h-96 w-96 rounded-full blur-[120px]"
      />
      <div
        aria-hidden
        className="bg-accent/10 pointer-events-none absolute end-1/4 -bottom-40 h-96 w-96 rounded-full blur-[120px]"
      />

      <div className="relative container mx-auto px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="border-primary/20 bg-primary/5 text-primary mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            {t('badge')}
          </span>
          <h2 className="text-foreground text-3xl font-bold text-balance md:text-5xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-5 text-base text-pretty md:text-lg">
            {t('description')}
          </p>
        </div>

        <div className="grid -translate-y-10 scale-90 items-center gap-12 sm:scale-100 md:-translate-y-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          {/* Orbit diagram */}
          <div className="flex justify-center">
            <div className="relative aspect-square w-[min(100%,26rem)] motion-reduce:[&_*]:!animate-none">
              {/* Soft radial wash that tracks the active accent */}
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-[18%] rounded-full opacity-40 blur-2xl transition-colors duration-700',
                  activeIndex === 0 && 'bg-primary/25',
                  activeIndex === 1 && 'bg-accent/25',
                  activeIndex === 2 && 'bg-success/25',
                  activeIndex === 3 && 'bg-warning/25'
                )}
              />

              {/* Expanding pulse rings from the hub */}
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-[22%] animate-[orbit-pulse-ring_3.2s_ease-out_infinite] rounded-full border',
                  activeIndex === 0 && 'border-primary/35',
                  activeIndex === 1 && 'border-accent/35',
                  activeIndex === 2 && 'border-success/35',
                  activeIndex === 3 && 'border-warning/35'
                )}
              />
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-[22%] animate-[orbit-pulse-ring_3.2s_ease-out_infinite] rounded-full border',
                  '[animation-delay:1.1s]',
                  activeIndex === 0 && 'border-primary/25',
                  activeIndex === 1 && 'border-accent/25',
                  activeIndex === 2 && 'border-success/25',
                  activeIndex === 3 && 'border-warning/25'
                )}
              />

              {/* Beam toward the active role (N / E / S / W) */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-transform duration-700 ease-out"
                style={{ transform: `rotate(${step * 90}deg)` }}>
                <div
                  className={cn(
                    'absolute top-[8%] left-1/2 h-[26%] w-px origin-bottom -translate-x-1/2 animate-[orbit-beam-sweep_2.4s_ease-in-out_infinite]',
                    'bg-linear-to-t from-transparent via-current to-transparent',
                    activeIndex === 0 && 'text-primary/70',
                    activeIndex === 1 && 'text-accent/70',
                    activeIndex === 2 && 'text-success/70',
                    activeIndex === 3 && 'text-warning/70'
                  )}
                />
              </div>

              {/* Rotating dashed rings + traveling dots */}
              <div
                aria-hidden
                className="border-border/70 absolute inset-[14%] animate-[spin_28s_linear_infinite] rounded-full border border-dashed"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[14%] animate-[orbit-dot-travel_14s_linear_infinite]">
                <span
                  className={cn(
                    'absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-colors duration-700',
                    activeRole.accent.dot
                  )}
                />
                <span
                  className={cn(
                    'absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 transition-colors duration-700',
                    activeRole.accent.dot
                  )}
                />
              </div>

              <div
                aria-hidden
                className="border-border/40 absolute inset-[26%] animate-[spin_20s_linear_infinite_reverse] rounded-full border border-dashed"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[26%] animate-[orbit-dot-travel_10s_linear_infinite_reverse]">
                <span
                  className={cn(
                    'absolute top-1/2 right-0 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 transition-colors duration-700',
                    activeRole.accent.dot
                  )}
                />
              </div>

              {/* Hub */}
              <div className="absolute inset-[34%] animate-[orbit-hub-breathe_4.5s_ease-in-out_infinite] rounded-full">
                <div
                  className={cn(
                    'flex h-full w-full flex-col items-center justify-center gap-1 rounded-full border border-white/40 bg-white/70 text-center shadow-2xl backdrop-blur-xl transition-shadow duration-700 dark:border-white/10 dark:bg-white/5',
                    activeIndex === 0 && 'shadow-primary/20',
                    activeIndex === 1 && 'shadow-accent/20',
                    activeIndex === 2 && 'shadow-success/20',
                    activeIndex === 3 && 'shadow-warning/20'
                  )}>
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className={cn(
                        'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
                        activeRole.accent.dot
                      )}
                    />
                    <span
                      className={cn(
                        'relative inline-flex h-2.5 w-2.5 rounded-full transition-colors duration-500',
                        activeRole.accent.dot
                      )}
                    />
                  </span>
                  <span className="text-foreground px-3 text-xs leading-tight font-bold md:text-sm">
                    {t('hub')}
                  </span>
                </div>
              </div>

              {/* Orbiting role nodes */}
              {roles.map((role, index) => {
                const isActive = index === activeIndex;
                const { Icon } = role;
                return (
                  <button
                    key={role.label}
                    type="button"
                    onClick={() => selectRole(index)}
                    aria-pressed={isActive}
                    style={role.position}
                    className={cn(
                      'group absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl px-3 py-3 focus-visible:outline-none',
                      isActive && 'z-10'
                    )}>
                    {/* Each layer owns exactly one transform: centering (button),
                        bob (here), then scale — so nothing snaps when the bob is
                        interrupted by a state change. */}
                    <span
                      className="block animate-[orbit-node-idle_3.6s_ease-in-out_infinite]"
                      style={{ animationDelay: `${index * 0.35}s` }}>
                      <span
                        className={cn(
                          'flex flex-col items-center gap-2 transition-transform duration-500 ease-out',
                          isActive ? 'scale-110' : 'scale-95 group-hover:scale-105'
                        )}>
                        <span className="relative">
                          {/* Always mounted; opacity gate keeps the ping from popping in. */}
                          <span
                            aria-hidden
                            className={cn(
                              'absolute inset-0 transition-opacity duration-500',
                              isActive ? 'opacity-40' : 'opacity-0'
                            )}>
                            <span
                              className={cn(
                                'block h-full w-full animate-[orbit-active-ping_1.8s_ease-out_infinite] rounded-2xl',
                                role.accent.dot
                              )}
                            />
                          </span>
                          <span
                            className={cn(
                              'relative flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg ring-2 transition-all duration-500 md:h-16 md:w-16',
                              isActive
                                ? cn(
                                    'border-transparent text-white shadow-xl',
                                    role.accent.dot,
                                    role.accent.ring,
                                    role.accent.glow
                                  )
                                : 'border-border bg-card text-muted-foreground ring-transparent'
                            )}>
                            <Icon
                              className={cn(
                                'h-6 w-6 transition-transform duration-500 md:h-7 md:w-7',
                                isActive && 'scale-110'
                              )}
                            />
                          </span>
                        </span>
                        <span
                          className={cn(
                            'text-xs font-semibold whitespace-nowrap transition-colors duration-500 md:text-sm',
                            isActive ? role.accent.text : 'text-muted-foreground'
                          )}>
                          {role.label}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active role panel */}
          <div className="bg-card/80 border-border relative rounded-3xl border p-7 shadow-xl backdrop-blur-sm md:p-9">
            <div
              aria-hidden
              className={cn(
                'absolute inset-x-8 -top-px h-px bg-linear-to-r from-transparent to-transparent transition-colors duration-500',
                activeIndex === 0 && 'via-primary',
                activeIndex === 1 && 'via-accent',
                activeIndex === 2 && 'via-success',
                activeIndex === 3 && 'via-warning'
              )}
            />

            {/* All four panels are stacked in one grid cell, so the card is always
                as tall as the tallest role and switching cross-fades instead of
                remounting into a different height. */}
            <div className="grid">
              {roles.map((role, index) => {
                const isActive = index === activeIndex;

                return (
                  <div
                    key={role.label}
                    aria-hidden={!isActive}
                    className={cn(
                      'col-start-1 row-start-1 transition-all duration-500 ease-out',
                      isActive
                        ? 'translate-y-0 opacity-100 blur-none'
                        : 'pointer-events-none translate-y-2 opacity-0 blur-[3px]'
                    )}>
                    <p
                      className={cn(
                        'text-xs font-bold tracking-[0.2em] uppercase',
                        role.accent.text
                      )}>
                      {role.label}
                    </p>
                    <h3 className="text-foreground mt-3 text-2xl font-bold md:text-3xl">
                      {role.title}
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm md:text-base">
                      {role.tagline}
                    </p>

                    <ul className="mt-7 space-y-4">
                      {role.bullets.map((bullet, bulletIndex) => (
                        <li
                          key={bullet}
                          className={cn(
                            'flex items-start gap-3 transition-all duration-500 ease-out',
                            isActive
                              ? 'translate-x-0 opacity-100'
                              : 'opacity-0 ltr:-translate-x-2 rtl:translate-x-2'
                          )}
                          style={{
                            transitionDelay: isActive ? `${120 + bulletIndex * 90}ms` : '0ms',
                          }}>
                          <span
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white',
                              role.accent.dot
                            )}>
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="text-foreground/90 text-sm leading-relaxed md:text-base">
                            {bullet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="border-border/70 mt-8 border-t pt-6">
              <p className="text-muted-foreground text-sm leading-relaxed">
                <span className="text-foreground font-semibold">{t('whyLabel')}</span>{' '}
                {t('whyItMatters')}
              </p>
            </div>
          </div>
        </div>

        {/* Role switcher pills (mobile-friendly duplicate control) */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 lg:hidden">
          {roles.map((role, index) => (
            <button
              key={role.label}
              type="button"
              onClick={() => selectRole(index)}
              aria-pressed={index === activeIndex}
              className={cn(
                'rounded-full border px-4 py-2 text-xs font-semibold transition-all',
                index === activeIndex
                  ? cn('border-transparent text-white', role.accent.dot)
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}>
              {role.label}
            </button>
          ))}
        </div>

        {/* Trust strip */}
        {/* <div className="border-border/70 mt-14 grid gap-6 border-t pt-10 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="text-center">
              <p className="text-primary text-2xl font-bold md:text-3xl">
                {t(`highlights.${index}.value`)}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">{t(`highlights.${index}.label`)}</p>
            </div>
          ))}
        </div> */}
      </div>
    </section>
  );
}

export default AudienceSection;
