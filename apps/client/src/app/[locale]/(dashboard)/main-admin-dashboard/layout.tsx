import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Roles } from '@darnozom/shared-types';
import { SiteHeader } from '@/components/molecules/site-header';
import { SidebarInset, SidebarProvider } from '@/components/atoms/sidebar';
import { AdminSidebar } from './__components/AdminSidebar';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('adminDashboardTitle') };
}

export default async function MainAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getAuthUser();

  if (!initialUser) {
    redirect(ROUTE_LOGIN);
  }
  if (initialUser.roleName !== Roles.PLATFORM_ADMIN) {
    redirect(getDashboardUrl(initialUser.roleName));
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
        <AdminSidebar user={initialUser} />
        <SidebarInset>
          <SiteHeader />
          <div className="container mx-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
