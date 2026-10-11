import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/components/molecules/site-header';
import { SidebarInset, SidebarProvider } from '@/components/atoms/sidebar';
import { ParentSidebar } from './__components/ParentSidebar';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { Roles } from '@darnozom/shared-types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('parentDashboardTitle') };
}

export default async function ParentDashboardLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getAuthUser();
  if (!initialUser || initialUser.roleName?.toLowerCase() !== Roles.PARENT.toLowerCase()) {
    redirect('/');
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
        <ParentSidebar user={initialUser} />
        <SidebarInset>
          <SiteHeader />
          <div className="p-base lg:p-12">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
