import { CalendarIcon, FileTextIcon } from '@radix-ui/react-icons';
import { BellIcon, Share2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Marquee } from '@/components/atoms/marquee';
import { AnimatedBeamMultipleOutputs } from '@/components/molecules/animated-beam-multiple-outputs';
import { AnimatedFeaturesList } from './animated-features-list';
import { BentoCard, BentoGrid } from '@/components/atoms/bento-grid';
import { Calendar } from '@/components/atoms/calendar';

export function FeaturesGrid() {
  const t = useTranslations('FeaturesGrid');

  const files = [
    {
      name: t('files.0.name'),
      body: t('files.0.body'),
    },
    {
      name: t('files.1.name'),
      body: t('files.1.body'),
    },
    {
      name: t('files.2.name'),
      body: t('files.2.body'),
    },
    {
      name: t('files.3.name'),
      body: t('files.3.body'),
    },
    {
      name: t('files.4.name'),
      body: t('files.4.body'),
    },
  ];

  const features = [
    {
      Icon: FileTextIcon,
      name: t('features.0.name'),
      description: t('features.0.description'),
      // href: '#',
      cta: t('features.0.cta'),
      className: 'col-span-3 lg:col-span-1',
      background: (
        <div className="dir-ltr">
          <Marquee
            pauseOnHover
            className="absolute top-10 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] [--duration:20s]">
            {files.map((f, idx) => (
              <figure
                key={idx}
                className={cn(
                  'relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4',
                  'border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]',
                  'dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]',
                  'transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none'
                )}>
                <div className="flex flex-row items-center gap-2">
                  <div className="flex flex-col">
                    <figcaption className="text-sm font-medium dark:text-white">
                      {f.name}
                    </figcaption>
                  </div>
                </div>
                <blockquote className="mt-2 text-xs">{f.body}</blockquote>
              </figure>
            ))}
          </Marquee>
        </div>
      ),
    },
    {
      Icon: BellIcon,
      name: t('features.1.name'),
      description: t('features.1.description'),
      // href: '#',
      cta: t('features.1.cta'),
      className: 'col-span-3 lg:col-span-2',
      background: (
        <AnimatedFeaturesList className="absolute top-4 right-2 h-[300px] w-full scale-75 border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90" />
      ),
    },
    {
      Icon: Share2Icon,
      name: t('features.2.name'),
      description: t('features.2.description'),
      // href: '#',
      cta: t('features.2.cta'),
      className: 'col-span-3 lg:col-span-2',
      background: (
        <AnimatedBeamMultipleOutputs className="absolute top-4 right-2 h-[300px] border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-105" />
      ),
    },
    {
      Icon: CalendarIcon,
      name: t('features.3.name'),
      description: t('features.3.description'),
      className: 'col-span-3 lg:col-span-1',
      // href: '#',
      cta: t('features.3.cta'),
      background: (
        <Calendar
          mode="single"
          selected={new Date(2022, 4, 11, 0, 0, 0)}
          className="absolute top-10 right-0 origin-top scale-75 rounded-md border [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90"
        />
      ),
    },
  ];

  return (
    <BentoGrid>
      {features.map((feature, idx) => (
        <BentoCard key={idx} {...feature} />
      ))}
    </BentoGrid>
  );
}
