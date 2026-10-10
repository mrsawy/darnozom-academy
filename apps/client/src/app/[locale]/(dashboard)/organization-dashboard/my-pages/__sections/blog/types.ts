import type { StyleProps } from '../utils';

export interface BlogArticle {
  title?: string;
  excerpt?: string;
  image?: string;
  author?: string;
  authorAvatar?: string;
  date?: string;
  readTime?: string;
  category?: string;
  link?: string;
  featured?: 'yes' | 'no';
}

export interface BlogSectionProps extends StyleProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  titleColor?: string;
  viewAllText?: string;
  viewAllLink?: string;
  layout?: 'grid' | 'featured' | 'magazine' | 'list';
  columns?: '2' | '3' | '4';
  cardStyle?: 'modern' | 'classic' | 'minimal' | 'overlay';
  showAuthor?: 'yes' | 'no';
  showDate?: 'yes' | 'no';
  showReadTime?: 'yes' | 'no';
  showCategory?: 'yes' | 'no';
  articles?: BlogArticle[];
}
