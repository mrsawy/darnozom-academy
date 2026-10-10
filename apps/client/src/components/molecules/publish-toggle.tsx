'use client';

import { Badge } from '@/components/atoms/badge';
import { Switch } from '@/components/atoms/switch';
import { useTranslations } from 'next-intl';
import { ApprovalStatus, PublishStatus } from '@lms-organization/shared-types';

const APPROVABLE_STATUSES = new Set<string>([
  ApprovalStatus.APPROVED,
  ApprovalStatus.PENDING_UPDATE,
]);

interface PublishToggleProps {
  publishStatus?: PublishStatus | string;
  approvalStatus?: string;
  isPending: boolean | null;
  onToggle: (newStatus: PublishStatus) => void;
}

export function PublishToggle({
  publishStatus,
  approvalStatus,
  isPending,
  onToggle,
}: PublishToggleProps) {
  const t = useTranslations('PublishStatus');

  const isPublished = publishStatus === PublishStatus.PUBLISHED;
  const isApproved = APPROVABLE_STATUSES.has(approvalStatus ?? '');

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isPublished ? 'default' : 'outline'}>
        {isPublished ? t('published') : t('draft')}
      </Badge>
      <span title={isApproved ? undefined : t('disabledTooltip')}>
        <Switch
          checked={isPublished}
          disabled={!isApproved || !!isPending}
          onCheckedChange={(checked) => {
            onToggle(checked ? PublishStatus.PUBLISHED : PublishStatus.DRAFT);
          }}
        />
      </span>
    </div>
  );
}
