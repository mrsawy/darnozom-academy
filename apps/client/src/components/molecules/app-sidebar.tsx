'use client';

import * as React from 'react';
import { type Icon } from '@tabler/icons-react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/i18n/navigation';
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
import { Roles } from '@darnozom/shared-types';

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
  /** Overrides the default platform name/link in the header (e.g. the academy's own branding). */
  brand?: {
    name: string;
    /** Resolved image URL; when empty/failing, `fallbackLogoSrc` is shown. */
    logoUrl?: string | null;
    href: string;
  };
}

/** Shown whenever the academy has no logo or its logo fails to load. */
const FALLBACK_LOGO_SRC = '/images/logo.png';

function BrandLogo({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = React.useState(false);
  const resolved = src && !failed ? src : FALLBACK_LOGO_SRC;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- presigned URL from an arbitrary host
    <img
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      className="size-7 shrink-0 rounded-md object-contain"
    />
  );
}

export function AppSidebar({ data, brand, ...props }: AppSidebarProps) {
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
              {brand ? (
                <LocaleLink href={brand.href}>
                  <BrandLogo src={brand.logoUrl} alt={brand.name} />
                  <span className="truncate text-base font-semibold">{brand.name}</span>
                </LocaleLink>
              ) : (
                <Link href="/">
                  <span className="text-base font-semibold">{t('appName')}</span>
                </Link>
              )}
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
