import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ApprovalStatus } from '@darnozom/shared-types';
import { SiteHeader } from '@/components/molecules/site-header';
import { SidebarInset, SidebarProvider } from '@/components/atoms/sidebar';
import { OrgSidebar } from './__components/OrgSidebar';
import { VerificationSuccessAlert } from './__components/verification-success-alert/verification-success-alert';
import { OrganizationDashboardOnboardingHost } from './__components/organization-dashboard-onboarding-host';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { getVerificationStatus } from '@/lib/actions/verification/verification.action';
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
  const initialUser = await getAuthUser();

  // Account-approval gate: an org cannot reach the dashboard until a platform
  // admin approves it. Pending/rejected orgs are sent to the verification wizard.
  // Fail open when status can't be read (e.g. org members without permission).
  const status = await getVerificationStatus();
  if (
    !('err' in status) &&
    status.approvalStatus &&
    status.approvalStatus !== ApprovalStatus.APPROVED
  ) {
    redirect(ROUTE_ORGANIZATION_VERIFICATION);
  }

  return (
    <div>
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }>
        <OrgSidebar user={initialUser} />
        <SidebarInset>
          <SiteHeader />
          <VerificationSuccessAlert />
          <OrganizationDashboardOnboardingHost user={initialUser} />
          <div className="">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
