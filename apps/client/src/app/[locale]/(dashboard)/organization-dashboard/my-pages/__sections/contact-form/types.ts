import type { StyleProps } from '../utils';

export interface ContactFormField {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'number';
  required?: 'yes' | 'no';
}

export interface ContactFormSectionProps extends StyleProps {
  title?: string;
  description?: string;
  submitLabel?: string;
  submitUrl?: string;
  layout?: 'single' | 'split' | 'minimal';
  formStyle?: 'card' | 'flat' | 'bordered';
  sideImage?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fields?: ContactFormField[];
  infoTitle?: string;
  infoEmail?: string;
  infoPhone?: string;
  infoAddress?: string;
}
