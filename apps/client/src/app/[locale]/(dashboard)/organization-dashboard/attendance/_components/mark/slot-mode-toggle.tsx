'use client';

import { useTranslations } from 'next-intl';

type SlotMode = 'single' | 'all';

interface SlotModeToggleProps {
  value: SlotMode;
  onChange: (mode: SlotMode) => void;
}

export function SlotModeToggle({ value, onChange }: SlotModeToggleProps) {
  const t = useTranslations('AttendanceMark');

  return (
    <div className="flex gap-2">
      {(['single', 'all'] as SlotMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            value === mode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}>
          {mode === 'single' ? t('singleSlot') : t('allSlots')}
        </button>
      ))}
    </div>
  );
}
