'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms/sheet';
import { ScrollProgress } from '../atoms/scroll-progress';
import { ThemeToggler } from '../molecules/theme-switcher';
import WishlistNavButton from '../molecules/wishlist-nav-button';
import { NavUserMenu } from '../molecules/nav-bar';
import useUserStore from '@/lib/store/userStore';
import { LOGO_URL } from '@/lib/data/constants';
import {
  ROUTE_ABOUT,
  ROUTE_CONTACT,
  ROUTE_COURSES,
  ROUTE_HOME,
  ROUTE_INSTRUCTORS,
  ROUTE_LOGIN,
  ROUTE_PRICING,
  ROUTE_SIGNUP,
} from '@/lib/data/constants/routes.constants';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';

interface NavLink {
  href: string;
  labelKey: string;
}

const PUBLIC_LINKS: NavLink[] = [
  { href: ROUTE_COURSES, labelKey: 'courses' },
  { href: ROUTE_INSTRUCTORS, labelKey: 'instructors' },
  { href: ROUTE_ABOUT, labelKey: 'aboutUs' },
  { href: ROUTE_CONTACT, labelKey: 'contact' },
  { href: ROUTE_PRICING, labelKey: 'pricing' },
];

/** Compact locale switch — the design shows both locales in one pill. */
function LocalePill() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      aria-label={t('toggleLanguage')}
      className="border-dz-line text-dz-ink-soft hover:border-dz-ink hover:text-dz-ink shrink-0 cursor-pointer rounded-full border px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors">
      <span className={locale === 'ar' ? 'text-dz-ink' : undefined}>{t('localeShort.ar')}</span>
      <span className="mx-1 opacity-50">·</span>
      <span className={locale === 'en' ? 'text-dz-ink' : undefined}>{t('localeShort.en')}</span>
    </button>
  );
}

function HomeNave({ hideAuthButtons = false }: { hideAuthButtons?: boolean } = {}) {
  const user = useUserStore((state) => state.user);
  const t = useTranslations('Navbar.links');
  const tNav = useTranslations('Navbar');

  const links: NavLink[] = [
    { href: ROUTE_HOME, labelKey: 'home' },
    ...(user ? [{ href: getDashboardUrl(user.roleName), labelKey: 'dashboard' }] : []),
    ...PUBLIC_LINKS,
  ];

  return (
    <>
      <header className="bg-dz-paper/92 border-dz-line sticky top-0 z-20 w-full border-b backdrop-blur-[10px]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-7 gap-y-3 px-6 py-3.5">
          <Link href={ROUTE_HOME} className="text-dz-ink flex shrink-0 items-center gap-2.5">
            <Image
              src={LOGO_URL}
              alt={tNav('logoAlt')}
              width={30}
              height={30}
              className="size-7.5 object-contain"
            />
            <span className="font-display text-2xl font-bold">{tNav('brandName')}</span>
          </Link>

          <nav className="hidden min-w-0 flex-1 flex-wrap gap-x-5.5 gap-y-1.5 text-[15px] font-medium lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-dz-ink hover:text-dz-terracotta transition-colors">
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-2.5">
            <WishlistNavButton />
            <div className="hidden items-center gap-2.5 sm:flex">
              <LocalePill />
              <ThemeToggler />
            </div>

            {user ? (
              <NavUserMenu user={user} />
            ) : hideAuthButtons ? null : (
              <>
                <Link
                  href={ROUTE_LOGIN}
                  className="text-dz-ink hover:text-dz-terracotta hidden px-3.5 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors sm:inline-flex">
                  {tNav('signIn')}
                </Link>
                <Link
                  href={ROUTE_SIGNUP}
                  className="bg-dz-ink text-dz-paper-raised hover:bg-dz-ink/90 inline-flex rounded-full px-4.5 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors">
                  {tNav('getStarted')}
                </Link>
              </>
            )}

            <Sheet>
              <SheetTrigger
                aria-label={tNav('mobileMenu')}
                className="text-dz-ink hover:text-dz-terracotta cursor-pointer p-1.5 transition-colors lg:hidden">
                <Menu className="size-5" aria-hidden />
              </SheetTrigger>
              <SheetContent side="left" className="bg-dz-paper flex w-72 flex-col p-0">
                <SheetHeader className="border-dz-line border-b p-4">
                  <SheetTitle className="font-display text-xl">{tNav('mobileMenu')}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-dz-ink hover:bg-dz-sand rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
                      {t(link.labelKey)}
                    </Link>
                  ))}
                </nav>
                <div className="border-dz-line mt-auto flex items-center gap-2.5 border-t p-3">
                  <LocalePill />
                  <ThemeToggler />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <ScrollProgress className="top-16" />
    </>
  );
}

export default HomeNave;
