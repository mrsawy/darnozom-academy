import type { StyleProps } from '../utils';

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface FooterColumn {
  title?: string;
  /** Editor uses newline-separated text; persisted JSON may use string[] */
  links?: string | string[];
}

export interface FooterBadge {
  text: string;
  icon: string;
}

export interface LegalLink {
  text: string;
  url: string;
}

export interface FooterSectionProps extends StyleProps {
  companyName?: string;
  logo?: string;
  description?: string;
  copyright?: string;
  backgroundColor?: string;
  textColor?: string;
  layout?: string;
  showNewsletter?: string;
  newsletterTitle?: string;
  newsletterPlaceholder?: string;
  showDivider?: string;
  columns?: FooterColumn[];
  socialLinks?: SocialLink[];
  badges?: FooterBadge[];
  legalLinks?: LegalLink[];
}
