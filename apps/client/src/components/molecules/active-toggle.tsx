'use client';

import { Badge } from '@/components/atoms/badge';
import { Switch } from '@/components/atoms/switch';
import { useTranslations } from 'next-intl';
import { ActiveStatus } from '@lms-organization/shared-types';

interface ActiveToggleProps {
  activeStatus?: ActiveStatus | string;
  isPending: boolean | null;
  onToggle: (newStatus: ActiveStatus) => void;
}

export function ActiveToggle({ activeStatus, isPending, onToggle }: ActiveToggleProps) {
  const t = useTranslations('ActiveStatus');

  const isActive = activeStatus !== ActiveStatus.INACTIVE;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? t('active') : t('inactive')}
      </Badge>
      <Switch
        checked={isActive}
        disabled={!!isPending}
        onCheckedChange={(checked) => {
          onToggle(checked ? ActiveStatus.ACTIVE : ActiveStatus.INACTIVE);
        }}
      />
    </div>
  );
}
