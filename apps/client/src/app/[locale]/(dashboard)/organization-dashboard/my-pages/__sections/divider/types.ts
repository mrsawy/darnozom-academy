import type { StyleProps } from '../utils';

export interface DividerSectionProps extends StyleProps {
  style?: 'solid' | 'dashed' | 'dotted' | 'double' | 'gradient';
  thickness?: string;
  width?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  label?: string;
  labelColor?: string;
  labelBackground?: string;
}
