'use client';
import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { BookOpenIcon, InfoIcon, Languages, LifeBuoyIcon, LogIn } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/atoms/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms/sheet';
import { cn } from '@/lib/utils';
import { ThemeToggler } from '../theme-switcher';
import { IUser } from '@/lib/types/user/user.interface';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { ROUTE_HOME } from '@/lib/data/constants/routes.constants';
import Image, { ImageProps } from 'next/image';
import WishlistNavButton from '../wishlist-nav-button';
import { LOGO_URL } from '@/lib/data/constants';
import { NavUserMenu } from './nav-user-menu';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../atoms/dropdown-menu';

// Simple logo component for the navbar
function Logo(props: Partial<ImageProps>) {
  const t = useTranslations('Navbar');

  return <Image {...props} src={LOGO_URL} width={40} height={40} alt={t('logoAlt')} />;
}
// Hamburger icon component
function HamburgerIcon({
  className,
  ...props
}: React.SVGAttributes<SVGElement> & { className?: string }) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <path
        d="M4 12L20 12"
        className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
      />
      <path
        d="M4 12H20"
        className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
      />
      <path
        d="M4 12H20"
        className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
      />
    </svg>
  );
}
// Types
export interface Navbar02NavItem {
  href?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  submenu?: boolean;
  type?: 'description' | 'simple' | 'icon';
  items?: {
    href: string;
    label: string;
    description?: string;
    icon?: string;
  }[];
}
export interface Navbar02Props extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  logoHref?: string;
  navigationLinks?: Navbar02NavItem[];
  signInText?: string;
  signInHref?: string;
  ctaText?: string;
  ctaHref?: string;
  onSignInClick?: () => void;
  onCtaClick?: () => void;
  user?: IUser;
  /** When true, hide login/signup for guests (user menu still shows when logged in). */
  hideAuthButtons?: boolean;
}
// Default navigation links
const defaultNavigationLinks: Navbar02NavItem[] = [
  { href: '#', label: 'Home' },
  {
    label: 'Features',
    submenu: true,
    type: 'description',
    items: [
      {
        href: '#components',
        label: 'Components',
        description: 'Browse all components in the library.',
      },
      {
        href: '#documentation',
        label: 'Documentation',
        description: 'Learn how to use the library.',
      },
      {
        href: '#templates',
        label: 'Templates',
        description: 'Pre-built layouts for common use cases.',
      },
    ],
  },
  {
    label: 'Pricing',
    submenu: true,
    type: 'simple',
    items: [
      { href: '#product-a', label: 'Product A' },
      { href: '#product-b', label: 'Product B' },
      { href: '#product-c', label: 'Product C' },
      { href: '#product-d', label: 'Product D' },
    ],
  },
  {
    label: 'About',
    submenu: true,
    type: 'icon',
    items: [
      {
        href: '#getting-started',
        label: 'Getting Started',
        icon: 'BookOpenIcon',
      },
      { href: '#tutorials', label: 'Tutorials', icon: 'LifeBuoyIcon' },
      { href: '#about-us', label: 'About Us', icon: 'InfoIcon' },
    ],
  },
];

function LanguageSwitcher() {
  const t = useTranslations('Navbar');
  const router = useRouter();
  const pathname = usePathname();
  const handleLocaleChange = (newLocale: 'en' | 'ar') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('toggleLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLocaleChange('en')}>
          {t('languageEnglish')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLocaleChange('ar')}>
          {t('languageArabic')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Navbar02 = React.forwardRef<HTMLElement, Navbar02Props>(
  (
    {
      className,
      logo = <Logo />,
      logoHref = ROUTE_HOME,
      navigationLinks = defaultNavigationLinks,
      signInText,
      signInHref: _signInHref = '#signin',
      ctaText,
      ctaHref: _ctaHref = '#get-started',
      onSignInClick,
      onCtaClick,
      user,
      hideAuthButtons = false,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLElement>(null);
    const t = useTranslations('Navbar');

    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setIsMobile(width < 768);
        }
      };
      checkWidth();
      const resizeObserver = new ResizeObserver(checkWidth);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLElement | null) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <header
        ref={combinedRef}
        className={cn(
          'bg-background/95 supports-[backdrop-filter]:bg-background/60 header-remove-has sticky top-0 z-50 w-full border-b px-4 backdrop-blur md:px-6 [&_*]:no-underline',
          className
        )}
        {...(props as React.HTMLAttributes<HTMLElement>)}>
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-2">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile drawer trigger */}
            {isMobile ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    className="group hover:bg-accent hover:text-accent-foreground h-9 w-9"
                    variant="ghost"
                    size="icon">
                    <HamburgerIcon />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-72 flex-col p-0">
                  <SheetHeader className="border-b p-4">
                    <SheetTitle>{t('mobileMenu')}</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-2 py-3">
                    <nav className="flex flex-col gap-0.5">
                      {navigationLinks.map((link, index) =>
                        link.submenu ? (
                          <div key={index}>
                            <p className="text-muted-foreground mt-3 mb-1 px-3 text-xs font-semibold tracking-wider uppercase first:mt-0">
                              {link.label}
                            </p>
                            {link.items?.map((item, itemIndex) => (
                              <Link
                                key={itemIndex}
                                href={item.href}
                                className="hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <Link
                            key={index}
                            href={link.href ?? ROUTE_HOME}
                            className="hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors">
                            {link.icon ? (
                              <link.icon className="size-4 shrink-0 opacity-70" />
                            ) : null}
                            {link.label}
                          </Link>
                        )
                      )}
                    </nav>
                  </div>
                  {/* Theme and language at the bottom of the drawer */}
                  <div className="mt-auto flex items-center gap-1 border-t p-3">
                    <ThemeToggler />
                    <LanguageSwitcher />
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
            {/* Logo + desktop nav */}
            <div className="flex items-center gap-6">
              <Link
                href={logoHref}
                className="text-primary hover:text-primary/90 flex cursor-pointer items-center space-x-2 transition-colors">
                <div className="me-2 text-2xl">{logo}</div>
                <span className="hidden font-sans text-xl font-bold sm:inline-block">
                  {t('brandName')}
                </span>
              </Link>
              {/* Desktop navigation menu */}
              {!isMobile && (
                <NavigationMenu className="flex">
                  <NavigationMenuList className="gap-1">
                    {navigationLinks.map((link, index) => (
                      <NavigationMenuItem key={index}>
                        {link.submenu ? (
                          <>
                            <NavigationMenuTrigger>{link.label}</NavigationMenuTrigger>
                            <NavigationMenuContent>
                              {link.type === 'description' && link.label === 'Features' ? (
                                <div className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                                  <div className="row-span-3">
                                    <NavigationMenuLink asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.preventDefault()}
                                        className="from-muted/50 to-muted flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-md bg-gradient-to-b p-6 text-center no-underline outline-none select-none focus:shadow-md">
                                        <div className="mb-3 text-xl font-medium">
                                          {t('featuredBrand')}
                                        </div>
                                        <p className="text-muted-foreground text-sm leading-tight">
                                          {t('featuredBrandDescription')}
                                        </p>
                                      </button>
                                    </NavigationMenuLink>
                                  </div>
                                  {link.items?.map((item, itemIndex) => (
                                    <ListItem
                                      key={itemIndex}
                                      title={item.label}
                                      href={item.href}
                                      type={link.type}>
                                      {item.description}
                                    </ListItem>
                                  ))}
                                </div>
                              ) : link.type === 'simple' ? (
                                <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                  {link.items?.map((item, itemIndex) => (
                                    <ListItem
                                      key={itemIndex}
                                      title={item.label}
                                      href={item.href}
                                      type={link.type}>
                                      {item.description}
                                    </ListItem>
                                  ))}
                                </div>
                              ) : link.type === 'icon' ? (
                                <div className="grid w-[400px] gap-3 p-4">
                                  {link.items?.map((item, itemIndex) => (
                                    <ListItem
                                      key={itemIndex}
                                      title={item.label}
                                      href={item.href}
                                      icon={item.icon}
                                      type={link.type}>
                                      {item.description}
                                    </ListItem>
                                  ))}
                                </div>
                              ) : (
                                <div className="grid gap-3 p-4">
                                  {link.items?.map((item, itemIndex) => (
                                    <ListItem
                                      key={itemIndex}
                                      title={item.label}
                                      href={item.href}
                                      type={link.type}>
                                      {item.description}
                                    </ListItem>
                                  ))}
                                </div>
                              )}
                            </NavigationMenuContent>
                          </>
                        ) : (
                          <NavigationMenuLink asChild>
                            <Link
                              href={link.href ?? ROUTE_HOME}
                              className={cn(navigationMenuTriggerStyle(), 'cursor-pointer')}>
                              {link.label}
                            </Link>
                          </NavigationMenuLink>
                        )}
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>
          </div>
          {/* Right side */}
          <div className="flex items-center gap-2">
            <WishlistNavButton />
            {/* Language and theme only visible on desktop; on mobile they live in the drawer */}
            <div className="hidden items-center gap-1 md:flex">
              <LanguageSwitcher />
              <ThemeToggler />
            </div>
            {user ? (
              <NavUserMenu user={user} />
            ) : hideAuthButtons ? null : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-accent hover:text-accent-foreground text-sm font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onSignInClick) onSignInClick();
                  }}>
                  {signInText ?? t('signIn')}
                  <LogIn />
                </Button>
                <Button
                  size="sm"
                  className="hidden h-9 rounded-md px-4 text-sm font-medium shadow-sm md:flex"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onCtaClick) onCtaClick();
                  }}>
                  {ctaText ?? t('getStarted')}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }
);
Navbar02.displayName = 'Navbar02';
// ListItem component for navigation menu items
const ListItem = React.forwardRef<
  React.ComponentRef<'a'>,
  React.ComponentPropsWithoutRef<'a'> & {
    title: string;
    href?: string;
    icon?: string;
    type?: 'description' | 'simple' | 'icon';
    children?: React.ReactNode;
  }
>(({ className, title, children, icon, type, ...props }, ref) => {
  const renderIconComponent = (iconName?: string) => {
    if (!iconName) return null;
    switch (iconName) {
      case 'BookOpenIcon': {
        return <BookOpenIcon className="h-5 w-5" />;
      }
      case 'LifeBuoyIcon': {
        return <LifeBuoyIcon className="h-5 w-5" />;
      }
      case 'InfoIcon': {
        return <InfoIcon className="h-5 w-5" />;
      }
      default: {
        return null;
      }
    }
  };
  return (
    <NavigationMenuLink asChild>
      <a
        ref={ref}
        className={cn(
          'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block cursor-pointer space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none',
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<'a'>)}>
        {type === 'icon' && icon ? (
          <div className="flex items-start space-x-4">
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              {renderIconComponent(icon)}
            </div>
            <div className="space-y-1">
              <div className="text-base leading-tight font-medium">{title}</div>
              {children ? (
                <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                  {children}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="text-base leading-none font-medium">{title}</div>
            {children ? (
              <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{children}</p>
            ) : null}
          </>
        )}
      </a>
    </NavigationMenuLink>
  );
});
ListItem.displayName = 'ListItem';
export { Logo, HamburgerIcon };
