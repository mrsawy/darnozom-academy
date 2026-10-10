import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  selectField,
  textField,
  colorField,
  alignmentField,
} from '../utils';
import type { DividerSectionProps } from './types';

const DividerSection = () => {
  return {
    fields: {
      ...styleFields,
      style: selectField([
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Dotted', value: 'dotted' },
        { label: 'Double', value: 'double' },
        { label: 'Gradient', value: 'gradient' },
      ]),
      thickness: selectField([
        { label: 'Thin (1px)', value: '1px' },
        { label: 'Medium (2px)', value: '2px' },
        { label: 'Thick (4px)', value: '4px' },
        { label: 'Extra Thick (8px)', value: '8px' },
      ]),
      width: selectField([
        { label: 'Quarter (25%)', value: '25%' },
        { label: 'Half (50%)', value: '50%' },
        { label: 'Three Quarters (75%)', value: '75%' },
        { label: 'Full (100%)', value: '100%' },
      ]),
      color: colorField(),
      alignment: alignmentField,
      label: textField(true),
      labelColor: colorField(),
      labelBackground: colorField(),
    },
    defaultProps: {
      ...defaultStyleProps,
      paddingTop: '32px',
      paddingBottom: '32px',
      style: 'solid',
      thickness: '2px',
      width: '100%',
      color: '#e5e7eb',
      alignment: 'center',
      label: '',
      labelColor: '#6b7280',
      labelBackground: '#ffffff',
    },
    render: ({
      style,
      thickness,
      width,
      color,
      alignment,
      label,
      labelColor,
      labelBackground,
      ...props
    }: DividerSectionProps) => {
      const styleProps = getStyleProps(props);

      const alignmentClass =
        alignment === 'left' ? 'mr-auto' : alignment === 'right' ? 'ml-auto' : 'mx-auto';

      if (label) {
        return (
          <div className="w-full px-6" style={styleProps}>
            <div
              className="relative flex items-center"
              style={{
                width,
                marginLeft:
                  alignment === 'right' ? 'auto' : alignment === 'center' ? 'auto' : undefined,
                marginRight:
                  alignment === 'left' ? 'auto' : alignment === 'center' ? 'auto' : undefined,
              }}>
              <div
                className="flex-1"
                style={{
                  borderTopStyle: style === 'gradient' ? 'solid' : (style as 'solid'),
                  borderTopWidth: thickness,
                  borderTopColor: style === 'gradient' ? 'transparent' : color,
                  backgroundImage:
                    style === 'gradient'
                      ? `linear-gradient(to right, transparent, ${color}, transparent)`
                      : undefined,
                  height: style === 'gradient' ? thickness : undefined,
                }}
              />
              <span
                className="px-4 text-sm font-medium"
                style={{ color: labelColor, backgroundColor: labelBackground }}>
                {label}
              </span>
              <div
                className="flex-1"
                style={{
                  borderTopStyle: style === 'gradient' ? 'solid' : (style as 'solid'),
                  borderTopWidth: thickness,
                  borderTopColor: style === 'gradient' ? 'transparent' : color,
                  backgroundImage:
                    style === 'gradient'
                      ? `linear-gradient(to left, transparent, ${color}, transparent)`
                      : undefined,
                  height: style === 'gradient' ? thickness : undefined,
                }}
              />
            </div>
          </div>
        );
      }

      return (
        <div className="w-full px-6" style={styleProps}>
          <div
            className={alignmentClass}
            style={{
              width,
              borderTopStyle: style === 'gradient' ? 'solid' : (style as 'solid'),
              borderTopWidth: style === 'gradient' ? 0 : thickness,
              borderTopColor: style === 'gradient' ? undefined : color,
              backgroundImage:
                style === 'gradient'
                  ? `linear-gradient(to right, transparent, ${color}, transparent)`
                  : undefined,
              height: style === 'gradient' ? thickness : undefined,
            }}
          />
        </div>
      );
    },
  };
};

export default DividerSection;
