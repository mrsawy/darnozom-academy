import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from 'next/font/google';
import '@/app/globals.css';
import { getMessages, getTranslations } from 'next-intl/server';
import Provider from './provider';
import {
  APP_URL,
  OG_IMAGE_URL,
  APPLE_ICON_URL,
  THEME_COLOR_PRIMARY_LIGHT,
  THEME_COLOR_PRIMARY_DARK,
} from '@/lib/data/constants/metadata.constants';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/** Body face for the whole product, Arabic and Latin alike. */
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-plex-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

/** Editorial display face — marketing headings only, via the `font-display` class. */
const naskhArabic = Noto_Naskh_Arabic({
  variable: '--font-naskh-arabic',
  subsets: ['arabic'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLOR_PRIMARY_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOR_PRIMARY_DARK },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    metadataBase: new URL(APP_URL),
    title: { default: t('homeTitle'), template: `%s | ${t('siteName')}` },
    description: t('homeDescription'),
    applicationName: t('siteName'),
    icons: { icon: '/favicon.ico', apple: APPLE_ICON_URL },
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SA'],
      title: { default: t('homeTitle'), template: `%s | ${t('siteName')}` },
      description: t('homeDescription'),
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: t('siteName') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: { default: t('homeTitle'), template: `%s | ${t('siteName')}` },
      description: t('homeDescription'),
      images: [OG_IMAGE_URL],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', ar: '/ar' },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'ar')) {
    redirect(`/${routing.defaultLocale}`);
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      suppressHydrationWarning
      className="custom-scrollbar">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plexArabic.variable} ${naskhArabic.variable} antialiased`}
        suppressHydrationWarning>
        <Provider locale={locale} messages={messages}>
          {children}
        </Provider>
      </body>
    </html>
  );
}
