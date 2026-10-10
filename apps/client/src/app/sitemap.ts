import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/data/constants/metadata.constants';

const PUBLIC_ROUTES = [
  '/',
  '/courses',
  '/pricing',
  '/privacy',
  '/terms',
  '/return-policy',
  '/delete-account',
];
const LOCALES = ['en', 'ar'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${APP_URL}/${locale}${path === '/' ? '' : path}`,
      lastModified: new Date(),
      alternates: {
        languages: {
          en: `${APP_URL}/en${path === '/' ? '' : path}`,
          ar: `${APP_URL}/ar${path === '/' ? '' : path}`,
        },
      },
    }))
  );
}
