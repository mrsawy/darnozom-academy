'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { useOrganizationDetails } from '@/lib/hooks/admin-review/use-admin-review.hook';
import { OrgHeader } from './__components/org-header';
import { OrgStats } from './__components/org-stats';
import { OrgPlanSection } from './__components/org-plan-section';
import { UsersTab } from './__components/users-tab';
import { CoursesTab } from './__components/courses-tab';
import { ContentsTab } from './__components/contents-tab';
import { EnrollmentsTab } from './__components/enrollments-tab';

export default function OrganizationDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const t = useTranslations('AdminDashboard');
  const { data: org, isLoading: orgLoading } = useOrganizationDetails(orgId);

  if (orgLoading) {
    return <div className="text-muted-foreground p-6">{t('emptyStates.loadingOrgDetails')}</div>;
  }

  if (!org) {
    return <div className="text-muted-foreground p-6">{t('emptyStates.orgNotFound')}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <OrgHeader org={org} />
      <OrgStats org={org} />
      <OrgPlanSection org={org} />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
          <TabsTrigger value="courses">{t('tabs.courses')}</TabsTrigger>
          <TabsTrigger value="contents">{t('tabs.contents')}</TabsTrigger>
          <TabsTrigger value="enrollments">{t('tabs.enrollments')}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UsersTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <CoursesTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="contents" className="mt-4">
          <ContentsTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          <EnrollmentsTab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
