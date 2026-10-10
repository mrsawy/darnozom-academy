'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Typography } from '@/components/atoms/typography';
const aboutImage = '/images/home-section-cards/card1/1.jpg';

function AboutMissionSection() {
  const t = useTranslations('about.mission');

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Image */}
          <div className="relative order-2 h-[400px] overflow-hidden rounded-tr-2xl rounded-br-2xl shadow-2xl max-[650px]:-translate-x-6 sm:rounded-2xl md:h-[500px] lg:order-1">
            <Image
              src={aboutImage}
              alt={t('imageAlt')}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Right Content */}
          <div className="order-1 space-y-6 max-[650px]:text-center lg:order-2">
            <Badge variant="primary">{t('badge')}</Badge>
            <Typography
              variant="h2"
              size="3xl"
              weight="bold"
              className="leading-tight md:text-4xl lg:text-5xl">
              {t('title')}
            </Typography>
            <Typography variant="p" size="lg" color="muted" className="leading-relaxed">
              {t('description1')}
            </Typography>
            {/* <Typography
              variant='p'
              size='lg'
              color='muted'
              className='leading-relaxed'
            >
              {t('description2')}
            </Typography> */}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutMissionSection;
