'use client';

import { AppSidebar } from '@/components/molecules/app-sidebar';
import useUserStore from '@/lib/store/userStore';
import { IUser } from '@/lib/types/user/user.interface';
import {
  IconMessageCircle,
  IconRobot,
  IconUsers,
  IconUsersGroup,
  IconWallet,
  IconBooks,
  IconCreditCard,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import {
  ROUTE_PARENT_AI_SUBSCRIPTION,
  ROUTE_PARENT_PAYMENTS,
  ROUTE_BOOKS,
} from '@/lib/data/constants/routes.constants';

export function ParentSidebar({ user }: { user?: IUser }) {
  const t = useTranslations('ParentSidebar');
  const { setUser } = useUserStore();

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  const navMain = [
    {
      title: t('navMain.childrenProgress'),
      url: '/parent-dashboard',
      icon: IconUsers,
      key: 'children-progress',
    },
    {
      title: t('navMain.children'),
      url: '/parent-dashboard/children',
      icon: IconUsersGroup,
      key: 'children',
    },
    {
      title: t('navMain.wallet'),
      url: '/parent-dashboard/wallet',
      icon: IconWallet,
      key: 'wallet',
    },
    {
      title: t('navMain.payments'),
      url: ROUTE_PARENT_PAYMENTS,
      icon: IconCreditCard,
      key: 'payments',
    },
    {
      title: t('navMain.booksStore'),
      url: ROUTE_BOOKS,
      icon: IconBooks,
      key: 'books-store',
    },
    {
      title: t('navMain.aiSubscription'),
      url: ROUTE_PARENT_AI_SUBSCRIPTION,
      icon: IconRobot,
      key: 'ai-subscription',
    },
    {
      title: t('navMain.chat'),
      url: '/parent-dashboard/chat',
      icon: IconMessageCircle,
      key: 'chat',
    },
  ];

  return (
    <AppSidebar
      data={{
        navMain,
        navSecondary: [],
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
