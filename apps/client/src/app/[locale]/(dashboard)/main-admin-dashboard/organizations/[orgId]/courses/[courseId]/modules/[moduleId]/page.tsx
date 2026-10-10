'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/atoms/button';
import { ModuleContentsTable } from './__components/module-contents-table';
import {
  ROUTE_MAIN_ADMIN_ORG_COURSE_MODULES,
  ROUTE_MAIN_ADMIN_ORGANIZATION_DETAIL,
} from '@/lib/data/constants/routes.constants';

export default function ModuleContentsPage({
  params,
}: {
  params: Promise<{ orgId: string; courseId: string; moduleId: string }>;
}) {
  const { orgId, courseId, moduleId } = use(params);
  const t = useTranslations('AdminDashboard');
  const router = useRouter();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(ROUTE_MAIN_ADMIN_ORGANIZATION_DETAIL(orgId))}>
          {t('breadcrumb.backToOrg')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(ROUTE_MAIN_ADMIN_ORG_COURSE_MODULES(orgId, courseId))}>
          ← {t('breadcrumb.backToCourse')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('tabs.moduleContents')}</h1>
        </div>
      </div>

      <ModuleContentsTable orgId={orgId} courseId={courseId} moduleId={moduleId} />
    </div>
  );
}
