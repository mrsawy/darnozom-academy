'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/molecules/app-sidebar';
import CalendarWithEvents from '@/components/molecules/date-input/calender-with-events';
import { useStudentCalendar } from '@/lib/hooks/calender/useStudentCalendar.hook';
import useUserStore from '@/lib/store/userStore';
import { IUser } from '@/lib/types/user/user.interface';
import {
  IconCalendarUser,
  IconDashboard,
  IconHelp,
  IconMessageCircle,
  IconQrcode,
  IconRobot,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconUsers,
  IconWallet,
  IconCalendar,
  IconHistory,
  IconBooks,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import {
  ROUTE_STUDENT_AI_SUBSCRIPTION,
  ROUTE_STUDENT_CHECK_IN,
  ROUTE_STUDENT_ATTENDANCE_WITH_SCANNER,
  ROUTE_STUDENT_ATTENDANCE_HISTORY,
  ROUTE_BOOKS,
  ROUTE_STUDENT_MY_GROUPS,
  ROUTE_STUDENT_MY_SESSIONS,
} from '@/lib/data/constants/routes.constants';

function SidebarCalendar() {
  const [month, setMonth] = React.useState(new Date());
  const { data: appointments, isLoading } = useStudentCalendar(month);

  return (
    <div className="m-2 sm:m-1">
      <CalendarWithEvents
        appointments={appointments}
        onMonthChange={setMonth}
        isLoading={isLoading}
      />
    </div>
  );
}

export const useStudentSidebarData = () => {
  const t = useTranslations('StudentSidebar');

  return {
    navMain: [
      {
        title: t('navMain.courses'),
        url: '/student-dashboard/courses',
        icon: IconDashboard,
        key: 'courses',
      },
      {
        title: t('navMain.myGroups'),
        url: ROUTE_STUDENT_MY_GROUPS,
        icon: IconUsersGroup,
        key: 'my-groups',
      },
      {
        title: t('navMain.mySessions'),
        url: ROUTE_STUDENT_MY_SESSIONS,
        icon: IconCalendar,
        key: 'my-sessions',
      },
      {
        title: t('navMain.wallet'),
        url: '/student-dashboard/wallet',
        icon: IconWallet,
        key: 'Wallet',
      },
      {
        title: t('navMain.booksStore'),
        url: ROUTE_BOOKS,
        icon: IconBooks,
        key: 'books-store',
      },
      {
        title: t('navMain.calendar'),
        url: '/student-dashboard/calendar',
        icon: IconCalendarUser,
        key: 'calendar',
      },
      {
        title: t('navMain.parentInfo'),
        url: '/student-dashboard/parent-info',
        icon: IconUsers,
        key: 'parent-info',
      },
      {
        title: t('navMain.bookings'),
        url: '/student-dashboard/bookings',
        icon: IconCalendar,
        key: 'bookings',
      },
      {
        title: t('navMain.Attendance'),
        url: ROUTE_STUDENT_CHECK_IN,
        icon: IconQrcode,
        key: 'check-in',
        children: [
          {
            title: t('navMain.checkIn'),
            url: ROUTE_STUDENT_CHECK_IN,
            icon: IconQrcode,
            key: 'check-in',
          },

          {
            title: t('navMain.attendWithScanner'),
            url: ROUTE_STUDENT_ATTENDANCE_WITH_SCANNER,
            icon: IconQrcode,
            key: 'attendance-with-scanner',
          },
          {
            title: t('navMain.attendanceHistory'),
            url: ROUTE_STUDENT_ATTENDANCE_HISTORY,
            icon: IconHistory,
            key: 'attendance-history',
          },
        ],
      },
      {
        title: t('navMain.aiAssistant'),
        url: '/student-dashboard/ai-assistant',
        icon: IconSparkles,
        key: 'ai-assistant',
      },
      {
        title: t('navMain.aiSubscription'),
        url: ROUTE_STUDENT_AI_SUBSCRIPTION,
        icon: IconRobot,
        key: 'ai-subscription',
      },
      {
        title: t('navMain.chat'),
        url: '/student-dashboard/chat',
        icon: IconMessageCircle,
        key: 'chat',
      },
    ],

    navSecondary: [
      {
        title: t('navSecondary.settings'),
        url: '#',
        icon: IconSettings,
      },
      {
        title: t('navSecondary.getHelp'),
        url: '#',
        icon: IconHelp,
      },
      {
        title: t('navSecondary.search'),
        url: '#',
        icon: IconSearch,
      },
    ],

    documentComponent: <SidebarCalendar />,
  };
};

export function StudentSidebar({ user }: { user?: IUser }) {
  const data = useStudentSidebarData();

  const { setUser } = useUserStore();

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  return (
    <AppSidebar
      data={{
        ...data,
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
