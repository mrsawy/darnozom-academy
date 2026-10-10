import type { StyleProps } from '../utils';

export interface GalleryItem {
  image?: string;
  caption?: string;
  link?: string;
}

export interface GallerySectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  images?: GalleryItem[];
  layout?: 'grid' | 'masonry' | 'featured';
  columns?: '2' | '3' | '4';
  gap?: string;
  aspectRatio?: string;
  borderRadius?: string;
  hoverEffect?: 'none' | 'zoom' | 'lift' | 'darken';
  showCaptions?: 'always' | 'hover' | 'hidden';
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}
