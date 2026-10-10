'use client';

import { useTranslations } from 'next-intl';
import { EntityStatusBadge } from './entity-status-badge';
import { SuspendButton } from './suspend-button';
import {
  useSuspendOrganization,
  useUnsuspendOrganization,
} from '@/lib/hooks/admin-review/use-admin-review.hook';
import type { IAdminOrganizationDetails } from '@/lib/types/admin-review/admin-review.interface';

interface OrgHeaderProps {
  org: IAdminOrganizationDetails;
}

export function OrgHeader({ org }: OrgHeaderProps) {
  const t = useTranslations('AdminDashboard');
  const suspend = useSuspendOrganization();
  const unsuspend = useUnsuspendOrganization();

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          <EntityStatusBadge status={org.status} />
        </div>
        <p className="text-muted-foreground text-sm">{org.slug}</p>
        {org.planName ? (
          <p className="text-muted-foreground text-xs">
            {t('table.plan')}: {org.planName}
          </p>
        ) : null}
      </div>
      <SuspendButton
        isSuspended={org.status === 'SUSPENDED'}
        onSuspend={() => suspend.mutate(org._id)}
        onUnsuspend={() => unsuspend.mutate(org._id)}
        isPending={suspend.isPending || unsuspend.isPending}
      />
    </div>
  );
}
