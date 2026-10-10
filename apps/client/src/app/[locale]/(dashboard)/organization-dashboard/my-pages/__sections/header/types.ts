import type { StyleProps } from '../utils';

export interface NavItem {
  label: string;
  link: string;
  highlight: string;
}

export interface HeaderSectionProps extends StyleProps {
  logo?: string;
  logoText?: string;
  backgroundColor?: string;
  textColor?: string;
  sticky?: string;
  transparent?: string;
  style?: string;
  navItems?: NavItem[];
  ctaText?: string;
  ctaLink?: string;
  showCta?: string;
}
