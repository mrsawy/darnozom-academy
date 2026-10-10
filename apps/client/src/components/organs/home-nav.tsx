'use client';
import { Navbar02, Navbar02NavItem } from '../molecules/nav-bar';
import { useRouter } from '@/i18n/navigation';
import { ScrollProgress } from '../atoms/scroll-progress';
import useUserStore from '@/lib/store/userStore';
import {
  ROUTE_HOME,
  ROUTE_LOGIN,
  ROUTE_SIGNUP,
  ROUTE_COURSES,
  ROUTE_INSTRUCTORS,
  ROUTE_ABOUT,
  ROUTE_CONTACT,
  ROUTE_PRICING,
} from '@/lib/data/constants/routes.constants';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { useTranslations } from 'next-intl';
import {
  HomeIcon,
  BookOpenIcon,
  UsersIcon,
  InfoIcon,
  PhoneIcon,
  TagIcon,
  LayoutDashboardIcon,
} from 'lucide-react';

function HomeNave({ hideAuthButtons = false }: { hideAuthButtons?: boolean } = {}) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const t = useTranslations('Navbar.links');

  const homeNavLinks: Navbar02NavItem[] = [
    { href: ROUTE_HOME, label: t('home'), icon: HomeIcon },
    ...(user
      ? [
          {
            href: getDashboardUrl(user.roleName),
            label: t('dashboard'),
            icon: LayoutDashboardIcon,
          },
        ]
      : []),
    { href: ROUTE_COURSES, label: t('courses'), icon: BookOpenIcon },
    { href: ROUTE_INSTRUCTORS, label: t('instructors'), icon: UsersIcon },
    { href: ROUTE_ABOUT, label: t('aboutUs'), icon: InfoIcon },
    { href: ROUTE_CONTACT, label: t('contact'), icon: PhoneIcon },
    { href: ROUTE_PRICING, label: t('pricing'), icon: TagIcon },
  ];

  return (
    <>
      <Navbar02
        user={user}
        logoHref={ROUTE_HOME}
        navigationLinks={homeNavLinks}
        hideAuthButtons={hideAuthButtons}
        signInHref={ROUTE_LOGIN}
        ctaHref={ROUTE_SIGNUP}
        onSignInClick={() => {
          router.push(ROUTE_LOGIN);
        }}
        onCtaClick={() => {
          router.push(ROUTE_SIGNUP);
        }}
      />
      <ScrollProgress className="top-16" />
    </>
  );
}

export default HomeNave;
