'use client';

import { type Icon } from '@tabler/icons-react';
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

export interface NavMainItem {
  title: string;
  url: string;
  icon?: Icon;
  key: string;
  children?: NavMainChild[];
}

export interface NavMainChild {
  title: string;
  url: string;
  key: string;
  icon?: Icon;
  iconClassName?: string;
  children?: NavMainChild[];
}

const matchesPath = (pathname: string, url: string) =>
  pathname === url || pathname.startsWith(url + '/');

/** URLs of every leaf under `items` (nodes with children are containers, never active themselves). */
function collectLeafUrls(items: NavMainChild[]): string[] {
  return items.flatMap((c) => (c.children?.length ? collectLeafUrls(c.children) : [c.url]));
}

function hasActiveDescendant(item: NavMainChild, activeUrl: string | undefined): boolean {
  if (!activeUrl) return false;
  return item.children?.length
    ? collectLeafUrls(item.children).includes(activeUrl)
    : item.url === activeUrl;
}

function NavSubTree({ items, activeUrl }: { items: NavMainChild[]; activeUrl?: string }) {
  return items.map((child) => {
    const icon = child.icon ? (
      <child.icon
        className={cn(
          'text-sidebar-foreground! group-hover/menu-sub-item:text-accent-foreground! size-4 shrink-0',
          child.iconClassName,
          child.url === activeUrl && !child.children?.length && 'text-accent-foreground!'
        )}
      />
    ) : null;

    if (child.children?.length) {
      return (
        <Collapsible
          key={child.key}
          defaultOpen={hasActiveDescendant(child, activeUrl)}
          className="group/sub-collapsible">
          <SidebarMenuSubItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton className="cursor-pointer transition-all duration-100 ease-linear">
                {icon}
                <span>{child.title}</span>
                <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/sub-collapsible:rotate-90 rtl:rotate-180" />
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <NavSubTree items={child.children} activeUrl={activeUrl} />
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuSubItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuSubItem key={child.key}>
        <SidebarMenuSubButton
          asChild
          isActive={child.url === activeUrl}
          className="transition-all duration-100 ease-linear">
          <Link href={child.url}>
            {icon}
            <span>{child.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  });
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-start gap-2">
            <ThemeToggler />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const leafUrls = hasChildren ? collectLeafUrls(item.children ?? []) : [];
            const bestMatch = leafUrls
              .filter((url) => matchesPath(pathname, url))
              .toSorted((a, b) => b.length - a.length)[0];
            const isChildActive = Boolean(bestMatch);
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
                        data-onboarding={item.key === 'courses' ? 'org-nav-courses' : undefined}
                        className={cn(
                          'cursor-pointer',
                          (isActive || isChildActive) && 'bg-accent/95 text-accent-foreground'
                        )}>
                        {item.icon ? <item.icon /> : null}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <NavSubTree items={item.children ?? []} activeUrl={bestMatch} />
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
