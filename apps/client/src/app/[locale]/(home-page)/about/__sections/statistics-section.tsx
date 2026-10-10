'use client';

import { Users, Award, Globe, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

function AboutStatisticsSection() {
  const t = useTranslations('about.statistics');

  const stats = [
    {
      icon: Users,
      value: t('items.0.value'),
      label: t('items.0.label'),
      colorClassName: 'text-primary',
      backgroundClassName: 'bg-primary/10',
    },
    {
      icon: Award,
      value: t('items.1.value'),
      label: t('items.1.label'),
      colorClassName: 'text-success',
      backgroundClassName: 'bg-success/10',
    },
    {
      icon: Globe,
      value: t('items.2.value'),
      label: t('items.2.label'),
      colorClassName: 'text-info',
      backgroundClassName: 'bg-info/10',
    },
    {
      icon: CheckCircle,
      value: t('items.3.value'),
      label: t('items.3.label'),
      colorClassName: 'text-success',
      backgroundClassName: 'bg-success/10',
    },
    // {
    //   icon: Briefcase,
    //   value: t('items.4.value'),
    //   label: t('items.4.label'),
    //   colorClassName: 'text-warning',
    //   backgroundClassName: 'bg-warning/10',
    // },
  ];

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-4 md:justify-between">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-muted/50 hover:bg-muted flex w-64 flex-col items-center rounded-xl p-6 text-center transition-all duration-300 hover:shadow-lg md:w-64"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}>
                <div
                  className={`${stat.backgroundClassName} ${stat.colorClassName} mb-4 rounded-full p-4`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className={`${stat.colorClassName} mb-2 text-3xl font-bold md:text-4xl`}>
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm font-medium md:text-base">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AboutStatisticsSection;
