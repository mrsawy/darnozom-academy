import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  colorField,
  radioField,
  selectField,
  linkField,
} from '../utils';
import type { AlertSectionProps } from './types';

const variantMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: '✅' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
  danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '🚨' },
  custom: { bg: '#f5f3ff', border: '#7c3aed', text: '#4c1d95', icon: '📣' },
};

const AlertSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      message: textField(true),
      variant: selectField([
        { label: 'Info', value: 'info' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Danger', value: 'danger' },
        { label: 'Custom', value: 'custom' },
      ]),
      icon: textField(true),
      ctaText: textField(true),
      ctaLink: linkField(),
      alignment: selectField([
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ]),
      style: selectField([
        { label: 'Bordered', value: 'bordered' },
        { label: 'Filled', value: 'filled' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Banner', value: 'banner' },
      ]),
      showIcon: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      // Custom variant colors
      customBg: colorField(),
      customBorder: colorField(),
      customText: colorField(),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Limited Time Offer!',
      message:
        'Enroll in any course today and get 30% off with code LEARN30. Offer expires in 48 hours.',
      variant: 'info',
      icon: 'ℹ️',
      ctaText: 'Claim Offer',
      ctaLink: '#',
      alignment: 'left',
      style: 'bordered',
      showIcon: 'yes',
      customBg: '#f5f3ff',
      customBorder: '#7c3aed',
      customText: '#4c1d95',
    },
    render: ({
      title,
      message,
      variant,
      icon,
      ctaText,
      ctaLink,
      alignment,
      style,
      showIcon,
      customBg,
      customBorder,
      customText,
      ...props
    }: AlertSectionProps) => {
      const styleProps = getStyleProps(props);
      const v = variantMap[variant ?? 'info'] ?? variantMap.info;
      const bg = variant === 'custom' ? (customBg ?? v.bg) : v.bg;
      const border = variant === 'custom' ? (customBorder ?? v.border) : v.border;
      const text = variant === 'custom' ? (customText ?? v.text) : v.text;
      const iconEl = showIcon === 'yes' ? (icon ?? v.icon) : null;
      const isCenter = alignment === 'center';

      const alertContent = (
        <div
          className={`flex ${isCenter ? 'flex-col items-center text-center' : 'items-start'} gap-4 sm:flex-row sm:items-center`}>
          {iconEl ? <span className="shrink-0 text-2xl leading-none">{iconEl}</span> : null}
          <div className={`flex flex-1 flex-col gap-1 ${isCenter ? 'items-center' : ''}`}>
            {title ? <p className="text-sm font-extrabold">{title}</p> : null}
            {message ? <p className="text-sm leading-relaxed opacity-90">{message}</p> : null}
          </div>
          {ctaText ? (
            <a
              href={ctaLink ?? '#'}
              className="shrink-0 rounded-lg px-4 py-1.5 text-xs font-extrabold text-white transition-all hover:scale-105 hover:opacity-90"
              style={{ backgroundColor: border }}>
              {ctaText}
            </a>
          ) : null}
        </div>
      );

      const containerStyle: React.CSSProperties =
        style === 'filled'
          ? { backgroundColor: border, color: '#ffffff' }
          : style === 'minimal'
            ? { color: text, borderLeft: `4px solid ${border}`, paddingLeft: '16px' }
            : style === 'banner'
              ? { backgroundColor: bg, borderTop: `3px solid ${border}`, color: text }
              : {
                  backgroundColor: bg,
                  border: `1px solid ${border}40`,
                  borderLeft: `4px solid ${border}`,
                  color: text,
                };

      if (style === 'banner') {
        return (
          <div style={{ ...styleProps, ...containerStyle }}>
            <div className="mx-auto max-w-7xl px-6 py-4 sm:px-10">{alertContent}</div>
          </div>
        );
      }

      return (
        <div className="px-6 py-6 sm:px-10" style={styleProps}>
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl p-5" style={containerStyle}>
              {alertContent}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default AlertSection;
