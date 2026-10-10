import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  radioField,
  selectField,
  arrayField,
} from '../utils';
import type { NewsletterSectionProps, NewsletterFeature } from './types';

const NewsLetterSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      placeholder: textField(true),
      buttonText: textField(true),
      privacyText: textField(true),
      backgroundColor: colorField(),
      textColor: colorField(),
      accentColor: colorField(),
      gradientFrom: colorField(),
      gradientTo: colorField(),
      backgroundStyle: selectField([
        { label: 'Solid', value: 'solid' },
        { label: 'Gradient', value: 'gradient' },
        { label: 'Light', value: 'light' },
      ]),
      layout: selectField([
        { label: 'Centered', value: 'center' },
        { label: 'Split (text + form)', value: 'split' },
        { label: 'Inline (compact)', value: 'inline' },
        { label: 'Card', value: 'card' },
      ]),
      style: selectField([
        { label: 'Modern', value: 'modern' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Bold', value: 'bold' },
      ]),
      inputStyle: selectField([
        { label: 'Rounded', value: 'rounded-lg' },
        { label: 'Pill', value: 'rounded-full' },
        { label: 'Square', value: 'rounded-none' },
      ]),
      showIcon: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      icon: textField(true),
      benefits: arrayField({
        text: textField(true),
        icon: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Stay Ahead of the Curve',
      subtitle:
        'Get weekly insights, course updates, and exclusive learning resources delivered straight to your inbox.',
      placeholder: 'Enter your email address',
      buttonText: 'Subscribe Free',
      privacyText: 'No spam, ever. Unsubscribe anytime.',
      backgroundColor: '#1e1b4b',
      textColor: '#ffffff',
      accentColor: '#a78bfa',
      gradientFrom: '#1e1b4b',
      gradientTo: '#4c1d95',
      backgroundStyle: 'gradient',
      layout: 'center',
      style: 'modern',
      inputStyle: 'rounded-full',
      showIcon: 'yes',
      icon: '📧',
      benefits: [
        { text: 'Weekly curated articles', icon: '📰' },
        { text: 'Exclusive discount codes', icon: '🏷️' },
        { text: 'Early course access', icon: '🚀' },
      ],
    },
    render: ({
      title,
      subtitle,
      placeholder,
      buttonText,
      privacyText,
      backgroundColor,
      textColor,
      accentColor,
      gradientFrom,
      gradientTo,
      backgroundStyle,
      layout,
      style,
      inputStyle,
      showIcon,
      icon,
      benefits,
      ...props
    }: NewsletterSectionProps) => {
      const styleProps = getStyleProps(props);
      const primary = accentColor ?? '#a78bfa';
      const benefitsArr: NewsletterFeature[] = Array.isArray(benefits) ? benefits : [];

      const bgStyle: React.CSSProperties =
        backgroundStyle === 'gradient'
          ? {
              background: `linear-gradient(135deg, ${gradientFrom ?? '#1e1b4b'} 0%, ${gradientTo ?? '#4c1d95'} 100%)`,
            }
          : backgroundStyle === 'light'
            ? { backgroundColor: '#f5f3ff' }
            : { backgroundColor: backgroundColor ?? '#1e1b4b' };

      const isDark = backgroundStyle !== 'light';
      const inputBg = isDark
        ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-white/60'
        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400';

      const form = (
        <div className="w-full">
          {layout === 'inline' ? (
            <div className={`flex w-full gap-2 ${inputStyle === 'rounded-full' ? '' : ''}`}>
              <input
                type="email"
                placeholder={placeholder}
                className={`min-w-0 flex-1 border px-5 py-3 text-sm backdrop-blur-sm transition-colors focus:outline-none ${inputStyle ?? 'rounded-full'} ${inputBg}`}
              />
              <button
                type="button"
                className={`shrink-0 px-6 py-3 text-sm font-bold transition-all hover:scale-105 hover:opacity-90 ${inputStyle ?? 'rounded-full'}`}
                style={{ backgroundColor: primary, color: '#1e1b4b' }}>
                {buttonText}
              </button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder={placeholder}
                className={`min-w-0 flex-1 border px-5 py-3.5 backdrop-blur-sm transition-colors focus:outline-none ${inputStyle ?? 'rounded-full'} ${inputBg}`}
              />
              <button
                type="button"
                className={`shrink-0 px-8 py-3.5 font-bold shadow-lg transition-all hover:scale-105 hover:opacity-90 ${inputStyle ?? 'rounded-full'}`}
                style={{ backgroundColor: primary, color: '#1e1b4b' }}>
                {buttonText}
              </button>
            </div>
          )}
          {privacyText ? (
            <p className={`mt-3 text-xs ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
              {privacyText}
            </p>
          ) : null}
        </div>
      );

      if (layout === 'inline') {
        return (
          <div className="px-6 py-14 sm:px-10" style={{ ...styleProps, ...bgStyle }}>
            <div className="mx-auto max-w-3xl text-center">
              {showIcon === 'yes' && icon ? <div className="mb-3 text-4xl">{icon}</div> : null}
              <h2
                className="mb-3 text-3xl font-extrabold tracking-tight"
                style={{ color: textColor }}>
                {title}
              </h2>
              <p className="mb-6 text-base opacity-80" style={{ color: textColor }}>
                {subtitle}
              </p>
              {form}
            </div>
          </div>
        );
      }

      if (layout === 'split') {
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, ...bgStyle }}>
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                <div style={{ color: textColor }}>
                  {showIcon === 'yes' && icon ? <div className="mb-4 text-5xl">{icon}</div> : null}
                  <h2 className="mb-4 text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
                    {title}
                  </h2>
                  <p className="mb-8 text-lg leading-relaxed opacity-80">{subtitle}</p>
                  {benefitsArr.length > 0 && (
                    <ul className="space-y-3">
                      {benefitsArr.map((b, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                            style={{ backgroundColor: `${primary}30` }}>
                            {b.icon}
                          </span>
                          <span className="opacity-85">{b.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl bg-white/10 p-8 backdrop-blur-sm">{form}</div>
              </div>
            </div>
          </div>
        );
      }

      if (layout === 'card') {
        return (
          <div
            className="px-6 py-20 sm:px-10"
            style={{ ...styleProps, backgroundColor: '#f5f3ff' }}>
            <div className="mx-auto max-w-2xl">
              <div className="overflow-hidden rounded-3xl shadow-2xl">
                <div className="p-10 sm:p-14" style={bgStyle}>
                  <div
                    className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
                    style={{ backgroundColor: primary }}
                  />
                  <div className="relative text-center" style={{ color: textColor }}>
                    {showIcon === 'yes' && icon ? (
                      <div className="mb-4 text-5xl">{icon}</div>
                    ) : null}
                    <h2 className="mb-3 text-3xl font-extrabold tracking-tight">{title}</h2>
                    <p className="mb-8 opacity-80">{subtitle}</p>
                    {form}
                    {benefitsArr.length > 0 && (
                      <div className="mt-8 flex flex-wrap justify-center gap-4">
                        {benefitsArr.map((b, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs opacity-70">
                            <span>{b.icon}</span>
                            <span>{b.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Center (default)
      return (
        <div
          className="relative overflow-hidden px-6 py-24 sm:px-10"
          style={{ ...styleProps, ...bgStyle }}>
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-15 blur-3xl"
            style={{ backgroundColor: primary }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: textColor }}
          />
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            {showIcon === 'yes' && icon ? <div className="mb-5 text-6xl">{icon}</div> : null}
            <h2
              className="mb-5 text-4xl font-extrabold tracking-tight md:text-5xl"
              style={{ color: textColor }}>
              {title}
            </h2>
            <p className="mb-10 text-lg leading-relaxed opacity-80" style={{ color: textColor }}>
              {subtitle}
            </p>
            {form}
            {benefitsArr.length > 0 && (
              <div className="mt-10 flex flex-wrap justify-center gap-6">
                {benefitsArr.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm opacity-70"
                    style={{ color: textColor }}>
                    <span>{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    },
  };
};

export default NewsLetterSection;
