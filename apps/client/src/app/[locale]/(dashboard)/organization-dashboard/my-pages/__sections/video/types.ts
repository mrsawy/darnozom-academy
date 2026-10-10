import type { StyleProps } from '../utils';

export interface VideoSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  videoUrl?: string;
  aspectRatio?: string;
  maxWidth?: string;
  borderRadius?: string;
  alignment?: string;
  textColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  border?: 'yes' | 'no';
  shadow?: string;
  showDecorator?: 'yes' | 'no';
}
