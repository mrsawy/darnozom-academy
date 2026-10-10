'use client';

import { AppSidebar } from '@/components/molecules/app-sidebar';
import { data } from '../data';
import { IUser } from '@/lib/types/user/user.interface';
import { useTranslations } from 'next-intl';

export function AdminSidebar({ user }: { user?: IUser }) {
  const t = useTranslations('AdminSidebar');

  const translatedData = {
    navMain: data.navMain.map(({ titleKey, children, ...item }) => ({
      ...item,
      title: t(titleKey),
      children: children?.map(({ titleKey: childKey, ...child }) => ({
        ...child,
        title: t(childKey),
      })),
    })),
    navSecondary: data.navSecondary.map(({ titleKey, children, ...item }) => ({
      ...item,
      title: t(titleKey),
      children: children?.map(({ titleKey: childKey, ...child }) => ({
        ...child,
        title: t(childKey),
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
