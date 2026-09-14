import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Hero } from './__components/hero';
import { Features } from './__components/features';
import { Cta } from './__components/cta';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('homeTitle'), description: t('homeDescription') };
}

export default function HomePage() {
  return (
    <div>
      <Hero />
      <Features />
      <Cta />
    </div>
  );
}
