'use client';

import { type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { IUser } from '@/types/user/user.interface';

export type DashboardNavItem = {
  href: string;
  icon: LucideIcon;
  labelKey: string;
};

export function DashboardSidebar({
  user,
  items,
  namespace,
}: {
  user: IUser | null;
  items: readonly DashboardNavItem[];
  namespace: 'dashboard.sidebar' | 'studentDashboard.sidebar' | 'parentDashboard.sidebar';
}) {
  const t = useTranslations(namespace);
  const pathname = usePathname();

  return (
    <aside className="flex h-svh w-64 shrink-0 flex-col border-e bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4 font-bold">{t('brand')}</div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ href, icon: Icon, labelKey }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
              )}>
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
      {user ? (
        <div className="border-t p-3 text-xs text-muted-foreground">
          {user.firstName} {user.lastName}
        </div>
      ) : null}
    </aside>
  );
}
