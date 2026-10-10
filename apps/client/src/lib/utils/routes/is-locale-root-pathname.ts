import { routing } from '@/i18n/routing';

/** True when `pathname` is exactly `/{locale}` (marketing home), e.g. `/en` or `/ar`. */
export function isLocaleRootPathname(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return (
    parts.length === 1 && routing.locales.includes(parts[0] as (typeof routing.locales)[number])
  );
}
