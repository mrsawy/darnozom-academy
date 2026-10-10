import { textField, linkField, selectField } from '../utils';
import type { ButtonComponentProps } from './types';

export const ButtonComponent = () => {
  return {
    fields: {
      text: textField(true),
      link: linkField(),
      style: selectField([
        { label: 'Primary (White)', value: 'primary' },
        { label: 'Secondary (Outline)', value: 'secondary' },
        { label: 'Ghost', value: 'ghost' },
        { label: 'Gradient', value: 'gradient' },
      ]),
      size: selectField([
        { label: 'Small', value: 'px-4 py-2 text-sm' },
        { label: 'Medium', value: 'px-6 py-3 text-base' },
        { label: 'Large', value: 'px-8 py-4 text-lg' },
        { label: 'Extra Large', value: 'px-10 py-5 text-xl' },
      ]),
      rounded: selectField([
        { label: 'None', value: 'rounded-none' },
        { label: 'Small', value: 'rounded' },
        { label: 'Medium', value: 'rounded-md' },
        { label: 'Large', value: 'rounded-lg' },
        { label: 'Extra Large', value: 'rounded-xl' },
        { label: 'Full', value: 'rounded-full' },
      ]),
      icon: textField(true),
      iconPosition: selectField([
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ]),
    },
    defaultProps: {
      text: 'Click Me',
      link: '#',
      style: 'primary',
      size: 'px-8 py-4 text-lg',
      rounded: 'rounded-lg',
      icon: '',
      iconPosition: 'left',
    },
    render: ({ text, link, style, size, rounded, icon, iconPosition }: ButtonComponentProps) => {
      const styleClasses: Record<NonNullable<ButtonComponentProps['style']>, string> = {
        primary: 'bg-white text-purple-600 hover:bg-gray-100 shadow-lg',
        secondary: 'border-2 border-white text-white hover:bg-white hover:text-gray-900',
        ghost: 'text-white hover:bg-white/20',
        gradient:
          'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg',
      };

      const currentStyle = style ?? 'primary';

      return (
        <a
          href={link}
          className={`inline-flex items-center gap-2 ${size} ${rounded} ${styleClasses[currentStyle]} transform font-semibold transition-all hover:scale-105`}>
          {icon && iconPosition === 'left' ? <span>{icon}</span> : null}
          {text}
          {icon && iconPosition === 'right' ? <span>{icon}</span> : null}
        </a>
      );
    },
  };
};

export default ButtonComponent;
