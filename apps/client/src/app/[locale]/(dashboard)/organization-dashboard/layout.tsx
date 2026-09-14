import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ApprovalStatus } from '@islamic-academy/shared-types';
import { getAuthUser } from '@/lib/api/get-auth-user';
import { OrgSidebar } from './__components/org-sidebar';
import { SiteHeader } from './__components/site-header';
import { ROUTE_ORGANIZATION_VERIFICATION } from '@/lib/data/constants/routes.constants';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('orgDashboardTitle') };
}

export default async function OrgDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();

  // Account-approval gate: an org cannot reach the dashboard until a platform
  // admin approves it. Pending/rejected orgs are sent to the verification page.
  // Fail open when the status can't be read (e.g. no organization on the user yet).
  const approvalStatus = user?.organization?.approvalStatus;
  if (approvalStatus && approvalStatus !== ApprovalStatus.APPROVED) {
    redirect(ROUTE_ORGANIZATION_VERIFICATION);
  }

  return (
    <div className="flex min-h-svh">
      <OrgSidebar user={user} />
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
