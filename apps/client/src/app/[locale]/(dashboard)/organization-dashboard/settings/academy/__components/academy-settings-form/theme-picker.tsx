'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { TWEAKCN_THEMES, type PresetTheme } from '@/lib/data/themes/tweakcn-themes';
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_THEME_ID,
} from '@/lib/data/themes/theme-utils';

interface ThemePickerProps {
  value: string;
  onChange: (themeId: string) => void;
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <div className="flex overflow-hidden rounded-md border">
      {colors.map((color, index) => (
        <div key={index} className="h-8 flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

function ThemeCard({
  label,
  selected,
  onSelect,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`bg-card space-y-2 rounded-lg border p-3 text-start transition-colors ${
        selected ? 'border-primary ring-primary/30 ring-2' : 'hover:border-primary/50'
      }`}>
      {children}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{label}</span>
        {selected ? <Check className="text-primary size-4 shrink-0" /> : null}
      </div>
    </button>
  );
}

function presetSwatches(theme: PresetTheme): string[] {
  const { background, primary, secondary, accent } = theme.light;
  return [background, primary, secondary, accent].filter(Boolean);
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  const t = useTranslations('AcademySettings');

  return (
    <div className="max-h-[28rem] overflow-y-auto pe-1">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <ThemeCard
          label={t('themeDefault')}
          selected={value === DEFAULT_THEME_ID}
          onSelect={() => onChange(DEFAULT_THEME_ID)}>
          <Swatches colors={['#f6f0e8', DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, '#e0b88e']} />
        </ThemeCard>

        {TWEAKCN_THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            label={theme.label}
            selected={value === theme.id}
            onSelect={() => onChange(theme.id)}>
            <Swatches colors={presetSwatches(theme)} />
          </ThemeCard>
        ))}
      </div>
    </div>
  );
}
