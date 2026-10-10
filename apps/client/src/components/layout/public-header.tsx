'use client';

import { useTranslations, useLocale } from 'next-intl';
import { BookOpen, ShoppingBag, Globe, User } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/lib/context/cart-context';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import {
  ROUTE_HOME,
  ROUTE_BOOKS,
  ROUTE_CART,
  ROUTE_LOGIN,
} from '@/lib/data/constants/routes.constants';

export function PublicHeader() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const { data: user } = useAuthUser();

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const otherLocaleLabel = locale === 'ar' ? 'English' : 'العربية';

  const switchLocale = () => {
    router.replace(pathname, { locale: otherLocale });
  };

  const dashboardUrl = user ? getDashboardUrl(user.roleName) : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Nav */}
        <div className="flex items-center gap-6 md:gap-8">
          <Link href={ROUTE_HOME} className="flex items-center gap-2 font-bold text-lg">
            <span className="text-primary font-extrabold text-xl">Darnozom</span>
            <span className="hidden text-sm text-muted-foreground sm:inline-block">|</span>
            <span className="text-sm font-semibold">{t('brand')}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href={ROUTE_HOME}
              className={`transition-colors hover:text-primary ${
                pathname === ROUTE_HOME ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              {t('home')}
            </Link>
            <Link
              href={ROUTE_BOOKS}
              className={`flex items-center gap-1.5 transition-colors hover:text-primary ${
                pathname.startsWith(ROUTE_BOOKS)
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              {t('books')}
            </Link>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Cart Icon */}
          <Button asChild variant="outline" size="sm" className="relative gap-2">
            <Link href={ROUTE_CART} aria-label={t('cart')}>
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">{t('cart')}</span>
              {itemCount > 0 && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 px-1 flex items-center justify-center text-xs rounded-full"
                >
                  {itemCount}
                </Badge>
              )}
            </Link>
          </Button>

          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={switchLocale}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{otherLocaleLabel}</span>
          </Button>

          {/* Auth Button */}
          {user && dashboardUrl ? (
            <Button asChild size="sm">
              <Link href={dashboardUrl} className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{user.firstName || t('dashboard')}</span>
                <span className="sm:hidden">{t('dashboard')}</span>
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={ROUTE_LOGIN}>{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
