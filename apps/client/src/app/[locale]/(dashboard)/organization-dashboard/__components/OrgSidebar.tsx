'use client';

import { AppSidebar } from '@/components/molecules/app-sidebar';
import { data } from '../data';
import { IUser } from '@/lib/types/user/user.interface';
import { useTranslations } from 'next-intl';
import { isNavItemVisible } from './filter-nav';

export function OrgSidebar({ user }: { user?: IUser }) {
  const t = useTranslations('OrgSidebar');

  const translatedData = {
    navMain: data.navMain
      .filter((item) => isNavItemVisible(item, user))
      .map((item) => ({
        ...item,
        title: t(item.titleKey),
        children: item.children
          ?.filter((child) => isNavItemVisible(child, user))
          .map((child) => ({
            ...child,
            title: t(child.titleKey),
          })),
      })),
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
    />
  );
}
