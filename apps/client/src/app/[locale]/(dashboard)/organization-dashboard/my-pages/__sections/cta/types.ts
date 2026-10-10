import type { StyleProps } from '../utils';

export interface CTAFeature {
  text?: string;
  icon?: string;
}

export interface CTASectionProps extends StyleProps {
  title?: string;
  description?: string;
  primaryButton?: string;
  primaryLink?: string;
  secondaryButton?: string;
  secondaryLink?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  backgroundStyle?: 'solid' | 'gradient' | 'image';
  backgroundImage?: string;
  overlayOpacity?: number;
  layout?: 'center' | 'split' | 'banner' | 'card';
  buttonStyle?: string;
  buttonSize?: string;
  showIcon?: 'yes' | 'no';
  icon?: string;
  features?: CTAFeature[];
}
