import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  colorFields,
  selectField,
  radioField,
  linkField,
} from '../utils';
import type { TextBlockSectionProps } from './types';

const TextBlockSection = () => {
  return {
    fields: {
      ...styleFields,
      eyebrow: textField(true),
      heading: textField(true),
      headingSize: selectField([
        { label: 'Small', value: 'text-3xl md:text-4xl' },
        { label: 'Medium', value: 'text-4xl md:text-5xl' },
        { label: 'Large', value: 'text-5xl md:text-6xl' },
        { label: 'Extra Large', value: 'text-6xl md:text-7xl' },
      ]),
      body: textareaField(true),
      bodySize: selectField([
        { label: 'Small', value: 'text-base' },
        { label: 'Medium', value: 'text-lg' },
        { label: 'Large', value: 'text-xl' },
        { label: 'Extra Large', value: 'text-2xl' },
      ]),
      ctaText: textField(true),
      ctaLink: linkField(),
      ...colorFields,
      accentColor: colorField(),
      alignment: selectField([
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ]),
      maxWidth: selectField([
        { label: 'Narrow (640px)', value: 'max-w-xl' },
        { label: 'Medium (768px)', value: 'max-w-3xl' },
        { label: 'Wide (1024px)', value: 'max-w-4xl' },
        { label: 'Full Width', value: 'max-w-7xl' },
      ]),
      showDivider: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      dividerStyle: selectField([
        { label: 'Line', value: 'line' },
        { label: 'Dots', value: 'dots' },
        { label: 'Gradient', value: 'gradient' },
      ]),
    },
    defaultProps: {
      ...defaultStyleProps,
      eyebrow: 'About us',
      heading: 'We Believe Learning Changes Everything',
      headingSize: 'text-4xl md:text-5xl',
      body: 'Our mission is to make high-quality education accessible to every person on the planet. Whether you are looking to switch careers, advance in your current role, or simply explore a passion — we have the tools and instructors to help you get there.',
      bodySize: 'text-lg',
      ctaText: 'Learn more about us',
      ctaLink: '#',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      alignment: 'center',
      maxWidth: 'max-w-3xl',
      showDivider: 'yes',
      dividerStyle: 'gradient',
    },
    render: ({
      eyebrow,
      heading,
      headingSize,
      body,
      bodySize,
      ctaText,
      ctaLink,
      backgroundColor,
      textColor,
      accentColor,
      alignment,
      maxWidth,
      showDivider,
      dividerStyle,
      ...props
    }: TextBlockSectionProps) => {
      const styleProps = getStyleProps(props);
      const primary = accentColor ?? '#7c3aed';
      const alignClass =
        {
          left: 'text-left items-start',
          center: 'text-center items-center',
          right: 'text-right items-end',
        }[alignment ?? 'center'] ?? 'text-center items-center';
      const marginClass =
        { left: '', center: 'mx-auto', right: 'ml-auto' }[alignment ?? 'center'] ?? 'mx-auto';

      const dividerEl =
        showDivider === 'yes' &&
        (dividerStyle === 'dots' ? (
          <div
            className={`flex gap-1.5 ${alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : ''}`}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: primary, opacity: i === 1 ? 1 : 0.4 }}
              />
            ))}
          </div>
        ) : dividerStyle === 'gradient' ? (
          <div
            className={`h-1 w-16 rounded-full ${alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto' : ''}`}
            style={{ background: `linear-gradient(90deg, ${primary}, #4f46e5)` }}
          />
        ) : (
          <div
            className={`h-px w-16 ${alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto' : ''}`}
            style={{ backgroundColor: primary }}
          />
        ));

      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div
            className={`flex flex-col gap-6 ${maxWidth ?? 'max-w-3xl'} ${marginClass} ${alignClass}`}>
            {eyebrow ? (
              <p
                className="text-sm font-extrabold tracking-widest uppercase"
                style={{ color: primary }}>
                {eyebrow}
              </p>
            ) : null}
            {dividerEl}
            {heading ? (
              <h2
                className={`${headingSize ?? 'text-4xl md:text-5xl'} leading-tight font-extrabold tracking-tight`}
                style={{ color: textColor }}>
                {heading}
              </h2>
            ) : null}
            {body ? (
              <p className={`${bodySize ?? 'text-lg'} leading-relaxed text-gray-500`}>{body}</p>
            ) : null}
            {ctaText ? (
              <a
                href={ctaLink ?? '#'}
                className="inline-flex items-center gap-2 font-bold transition-all hover:gap-3"
                style={{ color: primary }}>
                {ctaText} →
              </a>
            ) : null}
          </div>
        </div>
      );
    },
  };
};

export default TextBlockSection;
