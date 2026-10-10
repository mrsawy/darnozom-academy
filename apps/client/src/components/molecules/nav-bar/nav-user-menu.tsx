'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms/sheet';
import {
  IconCreditCard,
  IconLayoutDashboard,
  IconLogout,
  IconUserCircle,
} from '@tabler/icons-react';
import { IUser } from '@/lib/types/user/user.interface';
import useGeneralStore from '@/lib/store/generalStore';
import useLogout from '@/lib/utils/auth/logout';
import { Link, useRouter } from '@/i18n/navigation';
import { routesAfterLogin } from '@/app/[locale]/(auth)/__components/routesAfterLogin.config';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { useTranslations } from 'next-intl';
import { getAccountHref, getBillingHref } from './nav-user-routes';

interface NavUserMenuProps {
  user: IUser;
}

export function NavUserMenu({ user }: NavUserMenuProps) {
  const router = useRouter();
  const { handleLogout } = useLogout();
  const t = useTranslations('Navbar.userMenu');

  const billingHref = getBillingHref(user.roleName);
  const accountHref = getAccountHref(user.roleName);

  const handleLogoutClick = () => {
    void (async () => {
      try {
        useGeneralStore.setState({ generalIsLoading: true });
        await handleLogout();
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('NEXT_REDIRECT')) {
            router.push(ROUTE_LOGIN);
          }
          // eslint-disable-next-line no-console
          console.error('Logout error:', error.message);
        }
      } finally {
        useGeneralStore.setState({ generalIsLoading: false });
      }
    })();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarImage src={user.profile?.avatar} alt={user.firstName} />
            <AvatarFallback className="rounded-full">
              {user.firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="sr-only">{t('title')}</SheetTitle>
          <div className="flex items-center gap-3 pr-6">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={user.profile?.avatar} alt={user.firstName} />
              <AvatarFallback className="rounded-lg">
                {user.firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid text-left leading-tight">
              <span className="max-w-[9rem] truncate text-start font-semibold">
                {user.firstName}
              </span>
              <span className="text-muted-foreground truncate text-xs">{user.email}</span>
            </div>
          </div>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-2">
          <Link
            href={routesAfterLogin(user.roleName)}
            className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors">
            <IconLayoutDashboard className="size-4" />
            {t('dashboard')}
          </Link>
          <Link
            href={accountHref}
            className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors">
            <IconUserCircle className="size-4" />
            {t('account')}
          </Link>
          {billingHref ? (
            <Link
              href={billingHref}
              className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors">
              <IconCreditCard className="size-4" />
              {t('billing')}
            </Link>
          ) : null}
        </nav>
        <Separator />
        <div className="px-2">
          <button
            type="button"
            className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            onClick={handleLogoutClick}>
            <IconLogout className="size-4" />
            {t('logOut')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
