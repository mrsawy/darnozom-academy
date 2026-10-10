import type { StyleProps } from '../utils';

export interface TeamMember {
  name?: string;
  role?: string;
  avatar?: string;
  bio?: string;
  linkedin?: string;
  twitter?: string;
  specialties?: string;
}

export interface TeamSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  columns?: string;
  cardStyle?: string;
  imageShape?: string;
  imageSize?: string;
  showSocial?: string;
  showBio?: string;
  members?: TeamMember[];
}
