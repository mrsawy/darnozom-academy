import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ar'],

  // Used when no locale matches
  defaultLocale: 'ar',
  // This will redirect "/" to "/ar"
  localePrefix: 'always', // This ensures locale is always in the URL
});
