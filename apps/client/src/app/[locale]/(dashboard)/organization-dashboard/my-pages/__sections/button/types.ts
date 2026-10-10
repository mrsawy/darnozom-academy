export interface ButtonComponentProps {
  text?: string;
  link?: string;
  style?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'px-4 py-2 text-sm' | 'px-6 py-3 text-base' | 'px-8 py-4 text-lg' | 'px-10 py-5 text-xl';
  rounded?:
    | 'rounded-none'
    | 'rounded'
    | 'rounded-md'
    | 'rounded-lg'
    | 'rounded-xl'
    | 'rounded-full';
  icon?: string;
  iconPosition?: 'left' | 'right';
}
