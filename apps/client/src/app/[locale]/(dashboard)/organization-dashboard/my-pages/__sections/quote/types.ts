import type { StyleProps } from '../utils';

export interface QuoteSectionProps extends StyleProps {
  quote?: string;
  author?: string;
  role?: string;
  company?: string;
  avatar?: string;
  style?: 'classic' | 'card' | 'banner' | 'minimal' | 'centered';
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  quoteSize?: string;
  showAvatar?: 'yes' | 'no';
}
