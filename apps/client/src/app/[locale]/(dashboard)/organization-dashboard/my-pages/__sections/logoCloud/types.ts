import type { StyleProps } from '../utils';

export interface LogoCloudItem {
  name: string;
  image?: string;
  link?: string;
}

export interface LogoCloudSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  layout?: string;
  columns?: string;
  logoSize?: string;
  grayscale?: string;
  animation?: string;
  logos?: LogoCloudItem[];
}
