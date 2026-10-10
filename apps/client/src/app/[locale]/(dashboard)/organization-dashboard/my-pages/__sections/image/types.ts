import type { StyleProps } from '../utils';

export interface ImageSectionProps extends StyleProps {
  image?: string;
  alt?: string;
  aspectRatio?: string;
  objectFit?: string;
  height?: string;
  caption?: string;
  borderRadius?: string;
  overlayOpacity?: string;
  overlayColor?: string;
}
