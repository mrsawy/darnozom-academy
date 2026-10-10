import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  linkField,
  colorFields,
  radioField,
  selectField,
  arrayField,
  imageField,
} from '../utils';
import { Button } from '@/components/atoms/button';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '@/components/atoms/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/atoms/sheet';
import Image from 'next/image';
import { getRenderableImageSrc } from '@/lib/utils/image-src';
import type { HeaderSectionProps, NavItem } from './types';
import { useTranslations } from 'next-intl';

export const HeaderSection = () => {
  return {
    fields: {
      ...styleFields,
      logo: imageField,
      logoText: textField(true),
      ...colorFields,
      sticky: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      transparent: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      style: selectField([
        { label: 'Default', value: 'default' },
        { label: 'Centered', value: 'centered' },
        { label: 'Split', value: 'split' },
        { label: 'Minimal', value: 'minimal' },
      ]),
      navItems: arrayField({
        label: textField(true),
        link: linkField(),
        highlight: radioField([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]),
      }),
      ctaText: textField(true),
      ctaLink: linkField(),
      showCta: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
    },
    defaultProps: {
      ...defaultStyleProps,
      logoText: 'EduPlatform',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      sticky: 'yes',
      transparent: 'no',
      style: 'default',
      navItems: [
        { label: 'Home', link: '/', highlight: 'no' },
        { label: 'Courses', link: '/courses', highlight: 'no' },
        { label: 'About', link: '/about', highlight: 'no' },
        { label: 'Contact', link: '/contact', highlight: 'no' },
      ],
      ctaText: 'Get Started',
      ctaLink: '/signup',
      showCta: 'yes',
    },
    render: function HeaderSectionRender({
      logo,
      logoText,
      backgroundColor,
      textColor,
      sticky,
      transparent,
      style,
      navItems,
      ctaText,
      ctaLink,
      showCta,
      ...props
    }: HeaderSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const logoSrc = getRenderableImageSrc(logo);
      const stickyClass = sticky === 'yes' ? 'sticky top-0 z-50' : '';
      const bgClass = transparent === 'yes' ? 'bg-transparent backdrop-blur-md' : '';
      const navItemsArray: NavItem[] = Array.isArray(navItems) ? navItems : [];

      if (style === 'centered') {
        return (
          <header
            className={`${stickyClass} ${bgClass} border-b`}
            style={{
              ...styleProps,
              backgroundColor: transparent === 'yes' ? 'rgba(255,255,255,0.9)' : backgroundColor,
            }}>
            <div className="mx-auto max-w-7xl px-6 py-4">
              {/* Logo Centered */}
              <div className="mb-4 flex justify-center">
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt={logoText ?? ''}
                    width={120}
                    height={40}
                    className="h-10 w-auto"
                  />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: textColor }}>
                    {logoText}
                  </span>
                )}
              </div>

              {/* Navigation Centered */}
              <nav className="flex justify-center">
                <NavigationMenu>
                  <NavigationMenuList className="flex gap-6">
                    {navItemsArray.map((item: NavItem, idx: number) => (
                      <NavigationMenuItem key={idx}>
                        <NavigationMenuLink
                          href={item.link || '#'}
                          className={`text-sm font-medium transition-colors hover:text-purple-600 ${item.highlight === 'yes' ? 'text-purple-600' : ''}`}
                          style={{ color: item.highlight === 'yes' ? '#7c3aed' : textColor }}>
                          {item.label}
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              </nav>
            </div>
          </header>
        );
      }

      if (style === 'split') {
        const midPoint = Math.ceil(navItemsArray.length / 2);
        const leftNav = navItemsArray.slice(0, midPoint);
        const rightNav = navItemsArray.slice(midPoint);

        return (
          <header
            className={`${stickyClass} ${bgClass} border-b`}
            style={{
              ...styleProps,
              backgroundColor: transparent === 'yes' ? 'rgba(255,255,255,0.9)' : backgroundColor,
            }}>
            <div className="mx-auto max-w-7xl px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left Nav */}
                <nav className="hidden gap-6 md:flex">
                  {leftNav.map((item: NavItem, idx: number) => (
                    <a
                      key={idx}
                      href={item.link || '#'}
                      className="text-sm font-medium transition-colors hover:text-purple-600"
                      style={{ color: textColor }}>
                      {item.label}
                    </a>
                  ))}
                </nav>

                {/* Logo Center */}
                <div className="flex-shrink-0">
                  {logoSrc ? (
                    <Image
                      src={logoSrc}
                      alt={logoText ?? ''}
                      width={120}
                      height={40}
                      className="h-10 w-auto"
                    />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: textColor }}>
                      {logoText}
                    </span>
                  )}
                </div>

                {/* Right Nav */}
                <nav className="hidden gap-6 md:flex">
                  {rightNav.map((item: NavItem, idx: number) => (
                    <a
                      key={idx}
                      href={item.link || '#'}
                      className="text-sm font-medium transition-colors hover:text-purple-600"
                      style={{ color: textColor }}>
                      {item.label}
                    </a>
                  ))}
                </nav>

                {/* Mobile Menu */}
                <Sheet>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="icon" type="button">
                      <span className="text-2xl">☰</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <nav className="mt-8 flex flex-col gap-4">
                      {navItemsArray.map((item: NavItem, idx: number) => (
                        <a
                          key={idx}
                          href={item.link || '#'}
                          className="text-lg font-medium transition-colors hover:text-purple-600">
                          {item.label}
                        </a>
                      ))}
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>
        );
      }

      if (style === 'minimal') {
        return (
          <header
            className={`${stickyClass} ${bgClass}`}
            style={{
              ...styleProps,
              backgroundColor: transparent === 'yes' ? 'transparent' : backgroundColor,
            }}>
            <div className="mx-auto max-w-7xl px-6 py-6">
              <div className="flex items-center justify-between">
                {/* Logo */}
                <div>
                  {logoSrc ? (
                    <Image
                      src={logoSrc}
                      alt={logoText ?? ''}
                      width={96}
                      height={32}
                      className="h-8 w-auto"
                    />
                  ) : (
                    <span className="text-xl font-bold" style={{ color: textColor }}>
                      {logoText}
                    </span>
                  )}
                </div>

                {/* Simple Nav */}
                <nav className="hidden gap-8 md:flex">
                  {navItemsArray.map((item: NavItem, idx: number) => (
                    <a
                      key={idx}
                      href={item.link || '#'}
                      className="text-sm transition-opacity hover:opacity-70"
                      style={{ color: textColor }}>
                      {item.label}
                    </a>
                  ))}
                </nav>

                {/* Mobile Menu */}
                <Sheet>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="sm" type="button">
                      {t('menu')}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <nav className="mt-8 flex flex-col gap-4">
                      {navItemsArray.map((item: NavItem, idx: number) => (
                        <a key={idx} href={item.link || '#'} className="text-lg">
                          {item.label}
                        </a>
                      ))}
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>
        );
      }

      // Default style
      return (
        <header
          className={`${stickyClass} ${bgClass} border-b shadow-sm`}
          style={{
            ...styleProps,
            backgroundColor: transparent === 'yes' ? 'rgba(255,255,255,0.95)' : backgroundColor,
          }}>
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2">
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt={logoText ?? ''}
                    width={120}
                    height={40}
                    className="h-10 w-auto"
                  />
                ) : (
                  <span className="text-2xl font-bold" style={{ color: textColor }}>
                    {logoText}
                  </span>
                )}
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden items-center gap-6 md:flex">
                {navItemsArray.map((item: NavItem, idx: number) => (
                  <a
                    key={idx}
                    href={item.link || '#'}
                    className={`text-sm font-medium transition-colors hover:text-purple-600 ${item.highlight === 'yes' ? 'font-semibold text-purple-600' : ''}`}
                    style={{ color: item.highlight === 'yes' ? '#7c3aed' : textColor }}>
                    {item.label}
                  </a>
                ))}

                {showCta === 'yes' && ctaLink && ctaText ? (
                  <Button asChild>
                    <a href={ctaLink}>{ctaText}</a>
                  </Button>
                ) : null}
              </nav>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" type="button">
                    <span className="text-2xl">☰</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <nav className="mt-8 flex flex-col gap-4">
                    {navItemsArray.map((item: NavItem, idx: number) => (
                      <a
                        key={idx}
                        href={item.link || '#'}
                        className="text-lg font-medium transition-colors hover:text-purple-600">
                        {item.label}
                      </a>
                    ))}
                    {showCta === 'yes' && ctaLink && ctaText ? (
                      <Button asChild className="mt-4">
                        <a href={ctaLink}>{ctaText}</a>
                      </Button>
                    ) : null}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      );
    },
  };
};

export default HeaderSection;
