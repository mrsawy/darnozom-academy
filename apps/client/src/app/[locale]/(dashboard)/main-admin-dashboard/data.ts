import {
  IconCategory,
  IconDashboard,
  IconBook,
  IconStack2,
  IconFileText,
  IconBuilding,
  IconMessageCircle,
  IconShieldCheck,
  IconCreditCard,
  IconSettings,
  IconArrowBarToDown,
  IconShieldLock,
  IconRobot,
  IconSchool,
  IconBuildingCommunity,
  type Icon,
} from '@tabler/icons-react';

import {
  ROUTE_MAIN_ADMIN_DASHBOARD,
  ROUTE_MAIN_ADMIN_CATEGORIES,
  ROUTE_MAIN_ADMIN_COURSES,
  ROUTE_MAIN_ADMIN_MODULES,
  ROUTE_MAIN_ADMIN_CONTENT,
  ROUTE_MAIN_ADMIN_ORGANIZATIONS,
  ROUTE_MAIN_ADMIN_VERIFICATIONS,
  ROUTE_MAIN_ADMIN_PLANS,
  ROUTE_MAIN_ADMIN_AI_PLANS,
  ROUTE_MAIN_ADMIN_AI_SUBSCRIPTIONS,
  ROUTE_MAIN_ADMIN_PLATFORM_OPTIONS,
  ROUTE_MAIN_ADMIN_WITHDRAWAL_REQUESTS,
  ROUTE_MAIN_ADMIN_ROLES,
  ROUTE_MAIN_ADMIN_GRADES,
  ROUTE_MAIN_ADMIN_SCHOOL_TYPES,
} from '@/lib/data/constants/routes.constants';

export interface MainAdminNavSecondarySource {
  titleKey: string;
  url: string;
  icon: Icon;
  key?: string;
  children?: {
    titleKey: string;
    url: string;
    key: string;
    icon?: Icon;
    iconClassName?: string;
  }[];
}

export const data = {
  navMain: [
    {
      titleKey: 'navMain.overview',
      url: ROUTE_MAIN_ADMIN_DASHBOARD,
      icon: IconDashboard,
      key: 'overview',
    },
    {
      titleKey: 'navMain.categories',
      url: ROUTE_MAIN_ADMIN_CATEGORIES,
      icon: IconCategory,
      key: 'categories',
    },
    { titleKey: 'navMain.courses', url: ROUTE_MAIN_ADMIN_COURSES, icon: IconBook, key: 'courses' },
    {
      titleKey: 'navMain.modules',
      url: ROUTE_MAIN_ADMIN_MODULES,
      icon: IconStack2,
      key: 'modules',
    },
    {
      titleKey: 'navMain.content',
      url: ROUTE_MAIN_ADMIN_CONTENT,
      icon: IconFileText,
      key: 'content',
    },
    {
      titleKey: 'navMain.organizations',
      url: ROUTE_MAIN_ADMIN_ORGANIZATIONS,
      icon: IconBuilding,
      key: 'organizations',
    },
    {
      titleKey: 'navMain.verifications',
      url: ROUTE_MAIN_ADMIN_VERIFICATIONS,
      icon: IconShieldCheck,
      key: 'verifications',
    },
    {
      titleKey: 'navMain.plans',
      url: ROUTE_MAIN_ADMIN_PLANS,
      icon: IconCreditCard,
      key: 'plans',
    },
    {
      titleKey: 'navMain.aiPlans',
      url: ROUTE_MAIN_ADMIN_AI_PLANS,
      icon: IconRobot,
      key: 'aiPlans',
      children: [
        {
          titleKey: 'navMain.aiPlansPlans',
          url: ROUTE_MAIN_ADMIN_AI_PLANS,
          key: 'aiPlansPlans',
        },
        {
          titleKey: 'navMain.aiPlansSubscriptions',
          url: ROUTE_MAIN_ADMIN_AI_SUBSCRIPTIONS,
          key: 'aiPlansSubscriptions',
        },
      ],
    },
    {
      titleKey: 'navMain.platformOptions',
      url: ROUTE_MAIN_ADMIN_PLATFORM_OPTIONS,
      icon: IconSettings,
      key: 'platformOptions',
    },
    {
      titleKey: 'navMain.withdrawalRequests',
      url: ROUTE_MAIN_ADMIN_WITHDRAWAL_REQUESTS,
      icon: IconArrowBarToDown,
      key: 'withdrawalRequests',
    },
    {
      titleKey: 'navMain.roles',
      url: ROUTE_MAIN_ADMIN_ROLES,
      icon: IconShieldLock,
      key: 'roles',
    },
    {
      titleKey: 'navMain.grades',
      url: ROUTE_MAIN_ADMIN_GRADES,
      icon: IconSchool,
      key: 'grades',
    },
    {
      titleKey: 'navMain.schoolTypes',
      url: ROUTE_MAIN_ADMIN_SCHOOL_TYPES,
      icon: IconBuildingCommunity,
      key: 'schoolTypes',
    },
    {
      titleKey: 'navMain.chat',
      url: '/main-admin-dashboard/chat',
      icon: IconMessageCircle,
      key: 'chat',
    },
  ],
  navSecondary: [] as MainAdminNavSecondarySource[],
};
