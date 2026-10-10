import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Roles } from '@islamic-academy/shared-types';
import { requireDashboardUser } from '@/lib/utils/routes/requireDashboardUser';
import { ParentSidebar } from './__components/parent-sidebar';
import { SiteHeader } from '../__components/site-header';

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
  const user = await requireDashboardUser([Roles.PARENT]);
  const t = await getTranslations('parentDashboard.header');

  return (
    <div className="flex min-h-svh">
      <ParentSidebar user={user} />
      <div className="flex flex-1 flex-col">
        <SiteHeader title={t('title')} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
