import type { StyleProps } from '../utils';

export interface AlertSectionProps extends StyleProps {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'custom';
  title?: string;
  message?: string;
  icon?: string;
  showIcon?: 'yes' | 'no';
  ctaText?: string;
  ctaLink?: string;
  alignment?: 'left' | 'center';
  style?: 'bordered' | 'filled' | 'minimal' | 'banner';
  customBg?: string;
  customBorder?: string;
  customText?: string;
}
