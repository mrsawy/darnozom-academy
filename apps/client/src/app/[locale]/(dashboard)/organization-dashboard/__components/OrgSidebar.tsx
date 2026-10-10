'use client';

import { AppSidebar } from '@/components/molecules/app-sidebar';
import { data } from '../data';
import { IUser } from '@/lib/types/user/user.interface';
import { useTranslations } from 'next-intl';
import { Roles } from '@lms-organization/shared-types';

export function OrgSidebar({ user }: { user?: IUser }) {
  const t = useTranslations('OrgSidebar');
  const isInstructor = user?.roleName === Roles.INSTRUCTOR;

  const translatedData = {
    navMain: data.navMain
      .filter((item) => !item.instructorOnly || isInstructor)
      .map((item) => ({
        ...item,
        title: t(item.titleKey),
        children: item.children?.map((child) => ({
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
