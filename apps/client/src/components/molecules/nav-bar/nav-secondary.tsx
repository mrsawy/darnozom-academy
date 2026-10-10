'use client';

import * as React from 'react';
import { type Icon } from '@tabler/icons-react';
import { ChevronRight } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
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

export interface NavSecondaryItem {
  title: string;
  url: string;
  icon: Icon;
  key?: string;
  children?: { title: string; url: string; key: string; icon?: Icon; iconClassName?: string }[];
}

export function NavSecondary({
  items,
  ...props
}: {
  items: NavSecondaryItem[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isSettingsActive =
              hasChildren &&
              item.children?.some((c) => pathname === c.url || pathname.startsWith(c.url + '/'));

            if (hasChildren) {
              const defaultOpen = isSettingsActive;
              return (
                <Collapsible
                  key={item.key ?? item.title}
                  defaultOpen={defaultOpen}
                  className="group">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={cn(isSettingsActive && 'bg-accent/95 text-secondary')}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {(() => {
                          // Find the best-matching (most specific) child URL
                          const bestMatch = item.children
                            ?.filter((c) => pathname === c.url || pathname.startsWith(c.url + '/'))
                            ?.toSorted((a, b) => b.url.length - a.url.length)[0]?.url;
                          return item.children?.map((child) => (
                            <SidebarMenuSubItem key={child.key}>
                              <SidebarMenuSubButton asChild isActive={child.url === bestMatch}>
                                <Link href={child.url}>
                                  {child.icon ? (
                                    <child.icon
                                      className={cn('size-4 shrink-0', child.iconClassName)}
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
              <SidebarMenuItem key={item.key ?? item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
