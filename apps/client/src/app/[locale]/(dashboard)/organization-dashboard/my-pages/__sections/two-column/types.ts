import type { StyleProps } from '../utils';

export interface BulletItem {
  text?: string;
  icon?: string;
}

export interface TwoColumnSectionProps extends StyleProps {
  eyebrow?: string;
  title?: string;
  titleSize?: string;
  body?: string;
  ctaText?: string;
  ctaLink?: string;
  buttonStyle?: string;
  buttonSize?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  bullets?: BulletItem[];
  media?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  mediaRadius?: string;
  mediaShadow?: string;
  layout?: 'text-left' | 'text-right' | 'text-only' | 'stacked';
  verticalAlign?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  showDecorator?: 'yes' | 'no';
}
