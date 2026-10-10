import HomeNave from '@/components/organs/home-nav';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Provider from './provider';
import Footer from '@/components/organs/footer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
  };
}

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      <HomeNave />
      {children}
      <Footer />
    </Provider>
  );
}
