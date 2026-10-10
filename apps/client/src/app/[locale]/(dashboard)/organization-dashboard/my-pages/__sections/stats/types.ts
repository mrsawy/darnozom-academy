import type { StyleProps } from '../utils';

export interface StatItem {
  number?: string;
  label?: string;
  icon?: string;
  description?: string;
  suffix?: string;
}

export interface StatsSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  layout?: string;
  columns?: string;
  numberSize?: string;
  showIcons?: string;
  showDividers?: string;
  animated?: string;
  style?: string;
  stats?: StatItem[];
}
