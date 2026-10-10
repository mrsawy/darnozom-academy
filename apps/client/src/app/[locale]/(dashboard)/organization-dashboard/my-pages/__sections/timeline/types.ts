import type { StyleProps } from '../utils';

export interface TimelineItem {
  year?: string;
  title?: string;
  description?: string;
  icon?: string;
  tag?: string;
}

export interface TimelineSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  layout?: 'vertical' | 'alternating' | 'horizontal';
  nodeStyle?: 'icon' | 'year' | 'numbered' | 'dot';
  connectorStyle?: 'solid' | 'dashed' | 'gradient';
  items?: TimelineItem[];
}
