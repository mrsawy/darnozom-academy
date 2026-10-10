import type { StyleProps } from '../utils';

export interface PricingPlan {
  name?: string;
  price?: string;
  period?: string;
  description?: string;
  features?: string;
  highlighted?: string;
  badge?: string;
  buttonLink?: string;
  customButtonText?: string;
  accentColor?: string;
}

export interface PricingSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  titleColor?: string;
  accentColor?: string;
  billingToggle?: string;
  style?: string;
  alignment?: string;
  buttonText?: string;
  showPopularBadge?: string;
  plans?: PricingPlan[];
}
