'use client';

import Image from 'next/image';
import { Button } from '@/components/atoms/button';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

function AboutGallerySection() {
  const t = useTranslations('about.gallery');

  const galleryImages = [
    { src: '/images/5272908.jpg', alt: t('images.0.alt') },
    { src: '/images/5784396.jpg', alt: t('images.1.alt') },
    { src: '/images/6521706.jpg', alt: t('images.2.alt') },
    { src: '/images/6523102.jpg', alt: t('images.3.alt') },
    { src: '/images/9193641.jpg', alt: t('images.4.alt') },
    { src: '/images/9216791.jpg', alt: t('images.5.alt') },
  ];

  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="space-y-6">
            <div className="bg-primary/10 text-primary inline-block rounded-full px-4 py-2 text-sm font-semibold tracking-wider uppercase">
              {t('badge')}
            </div>
            <h2 className="text-foreground text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              {t('title')}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t('description1')}</p>
            <p className="text-muted-foreground text-lg leading-relaxed">{t('description2')}</p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 mt-4">
              {t('cta')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Right Gallery Grid */}
          <div className="grid grid-cols-2 gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="group relative h-[200px] cursor-pointer overflow-hidden rounded-xl md:h-[250px]">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="bg-primary/0 group-hover:bg-primary/20 absolute inset-0 transition-colors duration-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutGallerySection;
