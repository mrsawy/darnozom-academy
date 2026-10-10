'use client';

import { useTranslations } from 'next-intl';
import { Typography } from '@/components/atoms/typography';
import {
  GraduationCap,
  Briefcase,
  Landmark,
  School,
  Stethoscope,
  Cpu,
  HeartHandshake,
  Store,
} from 'lucide-react';

function AboutCompaniesSection() {
  const t = useTranslations('about.companies');

  const industries = [
    { name: t('list.0'), icon: GraduationCap },
    { name: t('list.1'), icon: Briefcase },
    { name: t('list.2'), icon: Landmark },
    { name: t('list.3'), icon: School },
    { name: t('list.4'), icon: Stethoscope },
    { name: t('list.5'), icon: Cpu },
    { name: t('list.6'), icon: HeartHandshake },
    { name: t('list.7'), icon: Store },
  ];

  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="space-y-4">
            <Typography variant="h2" size="3xl" weight="bold" className="md:text-4xl">
              {t('title')} <span className="text-primary">{t('count')}</span>
            </Typography>
            <Typography variant="p" size="lg" color="muted" className="leading-relaxed">
              {t('description')}
            </Typography>
          </div>

          {/* Right Industries Grid */}
          <div className="grid grid-cols-2 items-center gap-6 md:grid-cols-4">
            {industries.map((item, index) => (
              <div
                key={index}
                className="bg-background border-border hover:border-primary/50 hover:bg-primary/5 group flex flex-col items-center justify-center rounded-xl border p-4 transition-all duration-300 hover:shadow-lg"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}>
                <item.icon className="text-muted-foreground group-hover:text-primary mb-3 h-8 w-8 transition-colors" />
                <Typography
                  variant="span"
                  size="sm"
                  color="muted"
                  weight="medium"
                  className="group-hover:text-foreground text-center transition-colors">
                  {item.name}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutCompaniesSection;
