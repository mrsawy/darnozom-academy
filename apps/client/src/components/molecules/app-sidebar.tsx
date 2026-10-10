'use client';

import * as React from 'react';
import { type Icon } from '@tabler/icons-react';
import Link from 'next/link';
import { NavDocuments } from '@/components/molecules/nav-bar/nav-documents';
import { NavMain } from '@/components/molecules/nav-bar/nav-main';
import { NavSecondary } from '@/components/molecules/nav-bar/nav-secondary';
import { NavUser } from '@/components/molecules/nav-bar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/atoms/sidebar';
import { useLocale, useTranslations } from 'next-intl';
import { Roles } from '@lms-organization/shared-types';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  data: {
    navMain?: {
      title: string;
      url: string;
      icon?: Icon;
      key: string;
      children?: { title: string; url: string; key: string; icon?: Icon; iconClassName?: string }[];
    }[];
    documents?: {
      name: string;
      url: string;
      icon: Icon;
    }[];
    navSecondary?: {
      title: string;
      url: string;
      icon: Icon;
      key?: string;
      children?: { title: string; url: string; key: string; icon?: Icon }[];
    }[];
    user?: {
      name: string;
      email: string;
      avatar: string;
      roleName: Roles;
    };
    documentComponent?: React.ReactNode;
  };
}

export function AppSidebar({ data, ...props }: AppSidebarProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const t = useTranslations('AppSidebar');

  return (
    <Sidebar collapsible="offcanvas" variant="inset" {...props} side={isRTL ? 'right' : 'left'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="transition-all duration-900! ease-linear data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/">
                {/* <IconInnerShadowTop className="!size-5" /> */}

                <span className="text-base font-semibold">{t('appName')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain ? <NavMain items={data.navMain} /> : null}
        {data.documents ? <NavDocuments items={data.documents} /> : null}
        {data.documentComponent}
        {data.navSecondary ? <NavSecondary items={data.navSecondary} className="mt-auto" /> : null}
      </SidebarContent>
      {data.user ? (
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
