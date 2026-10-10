'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/atoms/card';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

function ContactInfoSection() {
  const t = useTranslations('contact.info');

  const contactItems = [
    {
      icon: Mail,
      title: t('items.email.title'),
      value: t('items.email.value'),
      link: `mailto:${t('items.email.value')}`,
      colorClassName: 'text-primary',
      backgroundClassName: 'bg-primary/10',
    },
    {
      icon: Phone,
      title: t('items.phone.title'),
      value: t('items.phone.value'),
      link: `tel:${t('items.phone.value')}`,
      colorClassName: 'text-success',
      backgroundClassName: 'bg-success/10',
    },
    {
      icon: MapPin,
      title: t('items.address.title'),
      value: t('items.address.value'),
      link: '#',
      colorClassName: 'text-destructive',
      backgroundClassName: 'bg-destructive/10',
    },
    {
      icon: Clock,
      title: t('items.hours.title'),
      value: t('items.hours.value'),
      link: '#',
      colorClassName: 'text-warning',
      backgroundClassName: 'bg-warning/10',
    },
  ];

  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">{t('title')}</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">{t('description')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {contactItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={index}
                className="bg-background border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6 text-center">
                  <div
                    className={`${item.backgroundClassName} ${item.colorClassName} mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-foreground mb-2 font-semibold">{item.title}</h3>
                  {item.link === '#' ? (
                    <p className="text-muted-foreground text-sm break-words">{item.value}</p>
                  ) : (
                    <a
                      href={item.link}
                      className="text-muted-foreground hover:text-primary text-sm break-words transition-colors">
                      {item.value}
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ContactInfoSection;
