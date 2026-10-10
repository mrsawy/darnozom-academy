'use client';

import { useTranslations } from 'next-intl';
import { AnimatedList } from '@/components/atoms/animated-list';
import { cn } from '@/lib/utils';

interface Item {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
}

function Notification({ name, description, icon, color, time }: Item) {
  return (
    <figure
      className={cn(
        'relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-4',
        // animation styles
        'transition-all duration-200 ease-in-out hover:scale-[103%]',
        // light styles
        'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
        // dark styles
        'transform-gpu dark:bg-transparent dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]'
      )}>
      <div className="flex flex-row items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: color,
          }}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center text-lg font-medium whitespace-pre dark:text-white">
            <span className="text-sm sm:text-lg">{name}</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-gray-500">{time}</span>
          </figcaption>
          <p className="text-sm font-normal dark:text-white/60">{description}</p>
        </div>
      </div>
    </figure>
  );
}

export function AnimatedFeaturesList({ className }: { className?: string }) {
  const t = useTranslations('FeaturesGrid.notifications');

  const notifications = [
    {
      name: t('0.name'),
      description: t('0.description'),
      time: t('0.time'),
      icon: '💸',
      color: '#00C9A7',
    },
    {
      name: t('1.name'),
      description: t('1.description'),
      time: t('1.time'),
      icon: '👤',
      color: '#FFB800',
    },
    {
      name: t('2.name'),
      description: t('2.description'),
      time: t('2.time'),
      icon: '💬',
      color: '#FF3D71',
    },
    {
      name: t('3.name'),
      description: t('3.description'),
      time: t('3.time'),
      icon: '🗞️',
      color: '#1E86FF',
    },
  ];

  const repeatedNotifications = Array.from({ length: 10 }, () => notifications).flat();

  return (
    <div className={cn('relative flex h-[500px] w-full flex-col overflow-hidden p-2', className)}>
      <AnimatedList>
        {repeatedNotifications.map((item, idx) => (
          <Notification {...item} key={idx} />
        ))}
      </AnimatedList>

      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t" />
    </div>
  );
}
