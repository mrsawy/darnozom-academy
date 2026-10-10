import type { StyleProps } from '../utils';

export interface TextBlockSectionProps extends StyleProps {
  eyebrow?: string;
  heading?: string;
  body?: string;
  ctaText?: string;
  ctaLink?: string;
  alignment?: 'left' | 'center' | 'right';
  maxWidth?: string;
  headingSize?: string;
  bodySize?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  showDivider?: 'yes' | 'no';
  dividerStyle?: 'line' | 'dots' | 'gradient';
}
