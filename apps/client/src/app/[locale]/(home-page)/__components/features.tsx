'use client';

import { useTranslations } from 'next-intl';
import { BookOpen, Users, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const FEATURE_ICONS = [BookOpen, Users, ShieldCheck] as const;
const FEATURE_KEYS = ['classes', 'people', 'trust'] as const;

export function Features() {
  const t = useTranslations('home.features');

  return (
    <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-16 sm:grid-cols-3">
      {FEATURE_KEYS.map((key, i) => {
        const Icon = FEATURE_ICONS[i];
        return (
          <Card key={key}>
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <Icon className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">{t(`${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`${key}.description`)}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
