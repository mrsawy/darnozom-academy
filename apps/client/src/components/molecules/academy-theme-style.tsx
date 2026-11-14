import { buildThemeCss, type ThemeSelection } from '@/lib/data/themes/theme-utils';

/**
 * Overrides the global design tokens with an academy's theme. Renders nothing for the
 * platform default. Safe for server and client components (it is just a <style> tag).
 */
export function AcademyThemeStyle({ theme }: { theme: ThemeSelection | null | undefined }) {
  if (!theme) return null;
  const css = buildThemeCss(theme);
  if (!css) return null;
  return <style data-academy-theme>{css}</style>;
}
