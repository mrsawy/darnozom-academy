'use client';

import Image from 'next/image';
import { Button } from '@/components/atoms/button';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/atoms/badge';
import { Typography } from '@/components/atoms/typography';
import { useTranslations } from 'next-intl';
const aboutImage = '/images/home-section-cards/card3/3.jpg';

function AboutHeroSection() {
  const t = useTranslations('about.hero');

  return (
    <section className="from-background to-muted/20 relative overflow-hidden bg-gradient-to-b py-10 md:py-24">
      <div className="container mx-auto lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="space-y-6 px-6">
            <div className="text-muted-foreground text-center text-lg font-medium sm:text-start">
              <Badge
                variant="default"
                className="from-primary/30 to-primary/10 text-primary mb-6 rounded-full border-none bg-gradient-to-r px-9 py-2 font-bold">
                <div className="from-primary/40 to-primary/50 hover:bg-primary me-3 size-2 rounded-full bg-gradient-to-r" />
                {t('numberOneMultiTenantSolution')}
              </Badge>
            </div>
            <h1 className="text-foreground text-center text-4xl leading-tight font-bold sm:text-start md:text-5xl lg:text-6xl">
              {t('title')}
            </h1>
            <Typography variant="p" size="lg" color="muted" className="max-w-xl leading-relaxed">
              {t('description')}
            </Typography>
            <div className="flex justify-center gap-4 pt-4 sm:justify-start">
              <Button size="lg" variant="default" effect="expandIcon" icon={ArrowRight}>
                {t('learnMore')}
              </Button>
              <Button size="lg" variant="outline">
                {t('contactUs')}
              </Button>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative ml-12 h-[300px] overflow-hidden rounded-tl-2xl rounded-bl-2xl shadow-2xl sm:rounded-2xl md:h-[500px]">
            <Image
              src={aboutImage}
              alt={t('teamImageAlt')}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutHeroSection;
