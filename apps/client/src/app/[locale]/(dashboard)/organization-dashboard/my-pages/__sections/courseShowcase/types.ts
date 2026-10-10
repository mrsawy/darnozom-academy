import type { StyleProps } from '../utils';

export interface CourseShowcaseCourse {
  image?: string;
  title?: string;
  instructor?: string;
  price?: string;
  oldPrice?: string;
  rating?: string;
  students?: string;
  duration?: string;
  level?: string;
  badge?: string;
  category?: string;
  link?: string;
  learnMoreText?: string;
}

export interface CourseShowcaseSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  titleColor?: string;
  viewAllText?: string;
  showFilters?: 'yes' | 'no';
  layout?: 'grid' | 'carousel' | 'list';
  columns?: '2' | '3' | '4';
  cardStyle?: 'modern' | 'classic' | 'minimal' | 'bold';
  showBadges?: 'yes' | 'no';
  showDuration?: 'yes' | 'no';
  showLevel?: 'yes' | 'no';
  courses?: CourseShowcaseCourse[];
}
