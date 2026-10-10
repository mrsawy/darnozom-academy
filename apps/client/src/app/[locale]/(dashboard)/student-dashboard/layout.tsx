import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/atoms/sidebar';
import { Separator } from '@/components/atoms/separator';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { StudentSidebar } from './__components/StudentSideBar';
import { NotificationDropdown } from './__components/notification-dropdown';
import { Roles } from '@lms-organization/shared-types';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('studentDashboardTitle') };
}

export default async function OrgDashboardLayout({
  children,
  params: _params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const initialUser = await getAuthUser();
  if (!initialUser || initialUser.roleName.toLowerCase() !== Roles.STUDENT.toLowerCase()) {
    redirect('/');
  }
  const tCommon = await getTranslations('common');

  return (
    <div>
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }>
        <StudentSidebar user={initialUser} />
        <SidebarInset>
          <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
              <h1 className="text-base font-medium">{tCommon('dashboard')}</h1>
              <div className="ml-auto">
                <NotificationDropdown />
              </div>
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
