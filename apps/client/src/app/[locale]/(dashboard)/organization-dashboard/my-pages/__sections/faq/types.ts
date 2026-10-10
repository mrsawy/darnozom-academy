import type { StyleProps } from '../utils';

export interface FAQItem {
  question?: string;
  answer?: string;
  category?: string;
  icon?: string;
}

export interface FAQSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  titleColor?: string;
  accentColor?: string;
  layout?: 'single' | 'two' | 'sidebar';
  style?: 'modern' | 'classic' | 'minimal' | 'bold';
  showIcons?: 'yes' | 'no';
  showCategories?: 'yes' | 'no';
  openByDefault?: 'first' | 'none' | 'all';
  contactText?: string;
  contactLink?: string;
  faqs?: FAQItem[];
}
