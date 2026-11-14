'use client';

import { AppSidebar } from '@/components/molecules/app-sidebar';
import { data } from '../data';
import { IUser } from '@/lib/types/user/user.interface';
import { useTranslations } from 'next-intl';
import type { NavMainChild } from '@/components/molecules/nav-bar/nav-main';
import { isNavItemVisible } from './filter-nav';
import { useQuery } from '@/lib/utils';
import { getFileUrl } from '@/lib/actions/file/getPreSignedUrl';
import { useOrganizationSettings } from '@/lib/hooks/organization/use-organization-settings.hook';
import { ROUTE_ORGANIZATION_DASHBOARD } from '@/lib/data/constants/routes.constants';

interface RawNavItem {
  titleKey: string;
  url: string;
  key: string;
  icon?: NavMainChild['icon'];
  iconClassName?: string;
  requiredRoles?: readonly import('@darnozom/shared-types').Roles[];
  children?: readonly RawNavItem[];
  [key: string]: unknown;
}

export function OrgSidebar({ user }: { user?: IUser }) {
  const t = useTranslations('OrgSidebar');
  const tApp = useTranslations('AppSidebar');
  const { data: settings } = useOrganizationSettings();
  const logoFileKey = settings?.logoFileKey ?? null;
  const { data: logoUrl } = useQuery({
    queryKey: ['organization', 'logo-url', logoFileKey],
    queryFn: async () => {
      const res = await getFileUrl({ fileKey: logoFileKey as string });
      return typeof res === 'string' ? res : null;
    },
    enabled: !!logoFileKey,
    staleTime: 10 * 60 * 1000,
  });

  const translateItem = (item: RawNavItem): NavMainChild & { children?: NavMainChild[] } => ({
    ...item,
    title: t(item.titleKey),
    children: item.children
      ?.filter((child) => isNavItemVisible(child, user))
      .map((child) => translateItem(child)),
  });

  const translatedData = {
    navMain: data.navMain.filter((item) => isNavItemVisible(item, user)).map(translateItem),
    navSecondary: data.navSecondary.map((item) => ({
      ...item,
      title: t(item.titleKey),
      children: item.children?.map((child) => ({
        ...child,
        title: t(child.titleKey),
      })),
    })),
  };

  return (
    <AppSidebar
      data={{
        ...translatedData,
        user: user
          ? {
              name: user.firstName ?? '',
              email: user.email ?? '',
              avatar: user.profile?.avatar ?? '',
              roleName: user.roleName,
            }
          : undefined,
      }}
      variant="inset"
      brand={{
        name: settings?.name?.trim() || tApp('academyFallbackName'),
        logoUrl,
        href: ROUTE_ORGANIZATION_DASHBOARD,
      }}
    />
  );
}
