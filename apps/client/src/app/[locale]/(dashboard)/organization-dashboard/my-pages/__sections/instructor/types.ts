import type { StyleProps } from '../utils';

export interface Instructor {
  name: string;
  title: string;
  image?: string;
  bio?: string;
  courses?: string;
  students?: string;
  rating?: string;
  expertise?: string;
  twitter?: string;
  linkedin?: string;
  featured?: string;
}

export interface InstructorSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  titleColor?: string;
  layout?: string;
  columns?: string;
  cardStyle?: string;
  showSocial?: string;
  showStats?: string;
  showBio?: string;
  instructors?: Instructor[];
}
