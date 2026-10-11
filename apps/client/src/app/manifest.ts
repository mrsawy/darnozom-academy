import type { MetadataRoute } from 'next';
import { THEME_COLOR_PRIMARY_LIGHT } from '@/lib/data/constants/metadata.constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Darnozom LMS',
    short_name: 'Darnozom',
    description:
      'Next-generation learning management with AI-powered insights and multi-tenant architecture.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: THEME_COLOR_PRIMARY_LIGHT,
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
