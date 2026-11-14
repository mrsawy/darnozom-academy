import { TWEAKCN_THEMES, type PresetTheme, type ThemeTokens } from './tweakcn-themes';

/** Mirrors the platform's own palette in globals.css (:root --primary / --secondary). */
export const DEFAULT_PRIMARY_COLOR = '#9a5b2e';
export const DEFAULT_SECONDARY_COLOR = '#efdfcb';

export const DEFAULT_THEME_ID = 'default';
export const CUSTOM_THEME_ID = 'custom';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function findPresetTheme(themeId: string): PresetTheme | undefined {
  return TWEAKCN_THEMES.find((theme) => theme.id === themeId);
}

/** Black or white text, whichever reads better on the given background (WCAG relative luminance). */
export function getContrastColor(hex: string): string {
  const safe = isHexColor(hex) ? hex : DEFAULT_PRIMARY_COLOR;
  const channels = [1, 3, 5].map((start) => {
    const channel = parseInt(safe.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.4 ? '#1a1410' : '#ffffff';
}

function declarations(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([name, value]) => `--${name}:${value};`)
    .join('');
}

function customTokens(primary: string, secondary: string, mode: 'light' | 'dark'): ThemeTokens {
  const primaryForeground = getContrastColor(primary);
  const base: ThemeTokens = {
    primary,
    'primary-foreground': primaryForeground,
    ring: primary,
    'chart-1': primary,
    'sidebar-primary': primary,
    'sidebar-primary-foreground': primaryForeground,
    'sidebar-ring': primary,
  };

  if (mode === 'light') {
    const secondaryForeground = getContrastColor(secondary);
    return {
      ...base,
      secondary,
      'secondary-foreground': secondaryForeground,
      muted: secondary,
      accent: secondary,
      'accent-foreground': secondaryForeground,
      'sidebar-accent': secondary,
      'sidebar-accent-foreground': secondaryForeground,
    };
  }

  // Dark mode: sink the secondary into the dark surface so it stays a subtle tint.
  const tinted = `color-mix(in oklab, ${secondary} 18%, var(--background))`;
  return {
    ...base,
    secondary: tinted,
    'secondary-foreground': 'var(--foreground)',
    muted: tinted,
    accent: tinted,
    'accent-foreground': 'var(--foreground)',
    'sidebar-accent': tinted,
    'sidebar-accent-foreground': 'var(--foreground)',
  };
}

export interface ThemeSelection {
  themeId: string;
  primaryColor: string;
  secondaryColor: string;
}

/**
 * CSS overriding the global tokens for one academy. Returns an empty string for the
 * platform default so nothing is injected. Only values from the bundled preset list or
 * validated hex colors ever reach the output.
 */
export function buildThemeCss({ themeId, primaryColor, secondaryColor }: ThemeSelection): string {
  if (themeId === CUSTOM_THEME_ID) {
    if (!isHexColor(primaryColor) || !isHexColor(secondaryColor)) return '';
    return `:root{${declarations(customTokens(primaryColor, secondaryColor, 'light'))}}html.dark{${declarations(customTokens(primaryColor, secondaryColor, 'dark'))}}`;
  }

  const preset = findPresetTheme(themeId);
  if (!preset) return '';
  return `:root{${declarations(preset.light)}--radius:${preset.radius};}html.dark{${declarations(preset.dark)}}`;
}
