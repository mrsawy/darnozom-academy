import type { StyleProps } from '../utils';

export interface FeatureItem {
  icon?: string;
  title?: string;
  description?: string;
  image?: string;
  link?: string;
  accentColor?: string;
}

export interface FeatureGridSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  columns?: string;
  cardStyle?: 'elevated' | 'flat' | 'bordered' | 'gradient' | 'minimal';
  iconSize?: string;
  iconPosition?: 'top' | 'left';
  showArrow?: 'yes' | 'no';
  hoverEffect?: 'lift' | 'scale' | 'glow' | 'none';
  features?: FeatureItem[];
}

export interface FeatureCard {
  icon?: string;
  title?: string;
  description?: string;
  link?: string;
  accentColor?: string;
}

export interface FeatureCardsSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  columns?: string;
  cardStyle?: 'modern' | 'glass' | 'outlined' | 'filled';
  cards?: FeatureCard[];
}
