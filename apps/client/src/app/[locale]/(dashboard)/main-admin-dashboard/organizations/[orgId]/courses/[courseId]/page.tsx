'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { useOrganizationDetails } from '@/lib/hooks/admin-review/use-admin-review.hook';
import { ModulesTable } from './__components/modules-table';
import { ROUTE_MAIN_ADMIN_ORGANIZATION_DETAIL } from '@/lib/data/constants/routes.constants';

export default function CourseModulesPage({
  params,
}: {
  params: Promise<{ orgId: string; courseId: string }>;
}) {
  const { orgId, courseId } = use(params);
  const t = useTranslations('AdminDashboard');
  const router = useRouter();
  const { data: org } = useOrganizationDetails(orgId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(ROUTE_MAIN_ADMIN_ORGANIZATION_DETAIL(orgId))}>
          ← {t('breadcrumb.backToOrg')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('tabs.modules')}</h1>
          {org ? <p className="text-muted-foreground text-sm">{org.name}</p> : null}
        </div>
      </div>

      <ModulesTable orgId={orgId} courseId={courseId} />
    </div>
  );
}
