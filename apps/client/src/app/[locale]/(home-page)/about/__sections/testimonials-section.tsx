'use client';

import { Card, CardContent } from '@/components/atoms/card';
import { useTranslations } from 'next-intl';

function AboutTestimonialsSection() {
  const t = useTranslations('about.testimonials');

  const testimonials = [
    {
      quote: t('items.0.quote'),
      author: t('items.0.author'),
      role: t('items.0.role'),
    },
    {
      quote: t('items.1.quote'),
      author: t('items.1.author'),
      role: t('items.1.role'),
    },
    {
      quote: t('items.2.quote'),
      author: t('items.2.author'),
      role: t('items.2.role'),
    },
  ];

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">{t('title')}</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">{t('description')}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-muted/50 border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="text-primary flex h-12 w-12 items-center justify-center font-serif text-4xl opacity-30">
                    &quot;
                  </div>
                </div>
                <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="border-border border-t pt-6">
                  <div className="text-foreground font-semibold">{testimonial.author}</div>
                  <div className="text-muted-foreground mt-1 text-sm">{testimonial.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AboutTestimonialsSection;
