'use client';

import {
  IconCreditCard,
  IconDotsVertical,
  IconLayoutDashboard,
  IconLogout,
  IconUserCircle,
} from '@tabler/icons-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/atoms/sidebar';
import { routesAfterLogin } from '@/app/[locale]/(auth)/__components/routesAfterLogin.config';
import useLogout from '@/lib/utils/auth/logout';
import useGeneralStore from '@/lib/store/generalStore';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Link } from '@/i18n/navigation';
import { Roles } from '@darnozom/shared-types';
import { getAccountHref, getBillingHref } from './nav-user-routes';

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    roleName: Roles;
  };
}) {
  const isMobile = useIsMobile();
  const t = useTranslations('StudentSidebar.navUser');
  const { handleLogout } = useLogout();
  const accountHref = getAccountHref(user.roleName);
  const billingHref = getBillingHref(user.roleName);

  const handleLogoutClick = async () => {
    try {
      useGeneralStore.setState({ generalIsLoading: true });
      await handleLogout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };

  const initials = user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href={routesAfterLogin(user.roleName)}
                  className="flex w-full cursor-pointer items-center gap-2">
                  <IconLayoutDashboard />
                  {t('dashboard')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={accountHref} className="flex w-full cursor-pointer items-center gap-2">
                  <IconUserCircle />
                  {t('account')}
                </Link>
              </DropdownMenuItem>
              {billingHref ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={billingHref}
                    className="flex w-full cursor-pointer items-center gap-2">
                    <IconCreditCard />
                    {t('billing')}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {/* <DropdownMenuItem>
                <IconNotification />
                {t('notifications')}
              </DropdownMenuItem> */}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleLogoutClick()}>
              <IconLogout />
              {t('logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
