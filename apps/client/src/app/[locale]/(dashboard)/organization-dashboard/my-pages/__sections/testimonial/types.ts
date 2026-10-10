import type { StyleProps } from '../utils';

export interface Testimonial {
  content?: string;
  name?: string;
  role?: string;
  company?: string;
  avatar?: string;
  rating?: number | string;
  date?: string;
  featured?: string;
}

export interface TestimonialSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  layout?: string;
  columns?: string;
  cardStyle?: string;
  showRatings?: string;
  showCompany?: string;
  showDate?: string;
  avatarStyle?: string;
  avatarSize?: string;
  testimonials?: Testimonial[];
}
