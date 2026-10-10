import type { StyleProps } from '../utils';

export interface NewsletterFeature {
  icon?: string;
  text?: string;
}

export interface NewsletterSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
  privacyText?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  backgroundStyle?: 'solid' | 'gradient' | 'light';
  layout?: 'center' | 'split' | 'inline' | 'card';
  style?: 'modern' | 'minimal' | 'bold';
  inputStyle?: string;
  showIcon?: string;
  icon?: string;
  benefits?: NewsletterFeature[];
}
