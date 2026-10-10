import type { StyleProps } from '../utils';

export interface CountdownSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  targetDate?: string;
  ctaText?: string;
  ctaLink?: string;
  expiredMessage?: string;
  style?: 'boxed' | 'minimal' | 'inline';
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}
