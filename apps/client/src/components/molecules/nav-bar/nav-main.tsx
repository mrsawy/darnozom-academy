'use client';

import { IconCirclePlusFilled, type Icon } from '@tabler/icons-react';
import { ChevronRight } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/atoms/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/atoms/sidebar';
import { ThemeToggler } from '@/components/molecules/theme-switcher';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface NavMainItem {
  title: string;
  url: string;
  icon?: Icon;
  key: string;
  children?: {
    title: string;
    url: string;
    key: string;
    icon?: Icon;
    iconClassName?: string;
  }[];
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname();
  const t = useTranslations('StudentSidebar');

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip={t('quickCreate')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear">
              <IconCirclePlusFilled />
              <span>{t('quickCreate')}</span>
            </SidebarMenuButton>
            <ThemeToggler />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive =
              hasChildren &&
              item.children?.some((c) => pathname === c.url || pathname.startsWith(c.url + '/'));
            const isActive = pathname.includes(item.url);

            if (hasChildren) {
              return (
                <Collapsible
                  key={item.key}
                  defaultOpen={isChildActive}
                  className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={cn(
                          'cursor-pointer',
                          (isActive || isChildActive) && 'bg-accent/95 text-accent-foreground'
                        )}>
                        {item.icon ? <item.icon /> : null}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {(() => {
                          const bestMatch = item.children
                            ?.filter((c) => pathname === c.url || pathname.startsWith(c.url + '/'))
                            ?.toSorted((a, b) => b.url.length - a.url.length)[0]?.url;
                          return item.children?.map((child) => (
                            <SidebarMenuSubItem key={child.key}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={child.url === bestMatch}
                                className="transition-all duration-100 ease-linear">
                                <Link href={child.url}>
                                  {child.icon ? (
                                    <child.icon
                                      className={cn(
                                        'text-sidebar-foreground! group-hover/menu-sub-item:text-accent-foreground! size-4 shrink-0',
                                        child.iconClassName,
                                        child.url === bestMatch && 'text-accent-foreground!'
                                      )}
                                    />
                                  ) : null}
                                  <span>{child.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ));
                        })()}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <Link
                href={item.url}
                key={item.key}
                data-onboarding={
                  item.key === 'users'
                    ? 'org-nav-users'
                    : item.key === 'courses'
                      ? 'org-nav-courses'
                      : undefined
                }>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={cn('cursor-pointer', isActive && 'bg-accent/95 text-secondary')}
                    tooltip={item.title}>
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
