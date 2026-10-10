import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  linkField,
  colorField,
  colorFields,
  numberField,
  radioField,
  selectField,
  arrayField,
  imageField,
} from '../utils';
import type { CTASectionProps, CTAFeature } from './types';

const CTASection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      description: textareaField(true),
      primaryButton: textField(true),
      primaryLink: linkField(),
      secondaryButton: textField(true),
      secondaryLink: linkField(),
      ...colorFields,
      accentColor: colorField(),
      gradientFrom: colorField(),
      gradientTo: colorField(),
      backgroundStyle: selectField([
        { label: 'Solid Color', value: 'solid' },
        { label: 'Gradient', value: 'gradient' },
        { label: 'Image', value: 'image' },
      ]),
      backgroundImage: imageField,
      overlayOpacity: numberField(0, 1),
      layout: selectField([
        { label: 'Centered', value: 'center' },
        { label: 'Split Layout', value: 'split' },
        { label: 'Banner Strip', value: 'banner' },
        { label: 'Card (floating)', value: 'card' },
      ]),
      buttonStyle: selectField([
        { label: 'Rounded', value: 'rounded-lg' },
        { label: 'Pill', value: 'rounded-full' },
        { label: 'Square', value: 'rounded-none' },
      ]),
      buttonSize: selectField([
        { label: 'Small', value: 'px-6 py-2.5 text-sm' },
        { label: 'Medium', value: 'px-8 py-4 text-base' },
        { label: 'Large', value: 'px-10 py-5 text-lg' },
      ]),
      showIcon: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      icon: textField(true),
      features: arrayField({
        text: textField(true),
        icon: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Ready to Start Learning?',
      description:
        'Join thousands of students already learning on our platform and take your skills to the next level',
      primaryButton: 'Get Started Free',
      primaryLink: '#',
      secondaryButton: 'View Courses',
      secondaryLink: '#',
      backgroundColor: '#1f1135',
      textColor: '#ffffff',
      accentColor: '#a78bfa',
      gradientFrom: '#1f1135',
      gradientTo: '#3b1d6e',
      backgroundStyle: 'gradient',
      backgroundImage: '',
      overlayOpacity: 0.75,
      layout: 'center',
      buttonStyle: 'rounded-full',
      buttonSize: 'px-8 py-4 text-base',
      showIcon: 'yes',
      icon: '🚀',
      features: [
        { text: 'No credit card required', icon: '✓' },
        { text: 'Cancel anytime', icon: '✓' },
        { text: 'Access to 500+ courses', icon: '✓' },
      ],
    },
    render: ({
      title,
      description,
      primaryButton,
      primaryLink,
      secondaryButton,
      secondaryLink,
      backgroundColor,
      textColor,
      accentColor,
      gradientFrom,
      gradientTo,
      backgroundStyle,
      backgroundImage,
      overlayOpacity,
      layout,
      buttonStyle,
      buttonSize,
      showIcon,
      icon,
      features,
      ...props
    }: CTASectionProps) => {
      const styleProps = getStyleProps(props);
      const primaryColor = accentColor ?? '#a78bfa';

      const bgStyle: React.CSSProperties =
        backgroundStyle === 'gradient'
          ? {
              background: `linear-gradient(135deg, ${gradientFrom ?? '#1f1135'} 0%, ${gradientTo ?? '#3b1d6e'} 100%)`,
            }
          : { backgroundColor: backgroundColor ?? '#1f1135' };

      const featuresEl =
        features && features.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {features.map((f: CTAFeature, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm"
                style={{ color: textColor, opacity: 0.75 }}>
                <span className="font-bold" style={{ color: primaryColor }}>
                  {f.icon}
                </span>
                {f.text}
              </div>
            ))}
          </div>
        ) : null;

      const primaryBtn = (
        <a
          href={primaryLink ?? '#'}
          className={`inline-flex items-center justify-center gap-2 font-bold shadow-xl transition-all duration-200 hover:scale-105 hover:opacity-90 ${buttonSize ?? 'px-8 py-4 text-base'} ${buttonStyle ?? 'rounded-full'}`}
          style={{ backgroundColor: primaryColor, color: '#1f1135' }}>
          {primaryButton}
        </a>
      );

      const secondaryBtn = secondaryButton ? (
        <a
          href={secondaryLink ?? '#'}
          className={`inline-flex items-center justify-center gap-2 border-2 font-semibold backdrop-blur-sm transition-all duration-200 hover:bg-white/10 ${buttonSize ?? 'px-8 py-4 text-base'} ${buttonStyle ?? 'rounded-full'}`}
          style={{ borderColor: `${textColor ?? '#ffffff'}50`, color: textColor }}>
          {secondaryButton}
        </a>
      ) : null;

      if (layout === 'banner') {
        return (
          <div
            className="relative overflow-hidden px-6 py-10 sm:px-10"
            style={{ ...styleProps, ...bgStyle }}>
            {backgroundStyle === 'image' && backgroundImage ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                />
                <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
              </>
            ) : null}
            <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
              <div style={{ color: textColor }}>
                <h2 className="mb-1 text-2xl font-extrabold md:text-3xl">{title}</h2>
                <p className="text-base opacity-80">{description}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                {primaryBtn}
                {secondaryBtn}
              </div>
            </div>
          </div>
        );
      }

      if (layout === 'split') {
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, ...bgStyle }}>
            {backgroundStyle === 'image' && backgroundImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              />
            ) : null}
            <div className="relative z-10 mx-auto max-w-7xl">
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                <div style={{ color: textColor }}>
                  {showIcon === 'yes' && icon ? <div className="mb-5 text-6xl">{icon}</div> : null}
                  <h2 className="mb-5 text-4xl leading-tight font-extrabold md:text-5xl">
                    {title}
                  </h2>
                  <p className="mb-8 text-lg leading-relaxed opacity-85">{description}</p>
                  {features && features.length > 0 ? (
                    <ul className="mb-8 space-y-3">
                      {features.map((f: CTAFeature, idx: number) => (
                        <li key={idx} className="flex items-center gap-3">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: primaryColor }}>
                            {f.icon}
                          </span>
                          <span className="text-base">{f.text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-4">
                  {primaryBtn}
                  {secondaryBtn}
                </div>
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
            <div className="mx-auto max-w-5xl">
              <div
                className="relative overflow-hidden rounded-3xl p-10 shadow-2xl sm:p-16"
                style={bgStyle}>
                {backgroundStyle === 'image' && backgroundImage ? (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundImage})` }}
                    />
                    <div
                      className="absolute inset-0 bg-black"
                      style={{ opacity: overlayOpacity }}
                    />
                  </>
                ) : null}
                {/* Decorative blobs */}
                <div
                  className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
                  style={{ backgroundColor: primaryColor }}
                />
                <div
                  className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full opacity-10 blur-3xl"
                  style={{ backgroundColor: textColor }}
                />

                <div className="relative z-10 text-center" style={{ color: textColor }}>
                  {showIcon === 'yes' && icon ? <div className="mb-5 text-6xl">{icon}</div> : null}
                  <h2 className="mb-5 text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
                    {title}
                  </h2>
                  <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed opacity-85">
                    {description}
                  </p>
                  <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    {primaryBtn}
                    {secondaryBtn}
                  </div>
                  {featuresEl ? <div className="mt-8">{featuresEl}</div> : null}
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
          {backgroundStyle === 'image' && backgroundImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              />
              <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
            </>
          ) : null}
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-15 blur-3xl"
            style={{ backgroundColor: primaryColor }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: textColor }}
          />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            {showIcon === 'yes' && icon ? <div className="mb-6 text-6xl">{icon}</div> : null}
            <h2
              className="mb-5 text-4xl leading-tight font-extrabold tracking-tight md:text-6xl"
              style={{ color: textColor }}>
              {title}
            </h2>
            <p className="mb-10 text-lg leading-relaxed opacity-85" style={{ color: textColor }}>
              {description}
            </p>
            <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {primaryBtn}
              {secondaryBtn}
            </div>
            {featuresEl}
          </div>
        </div>
      );
    },
  };
};

export default CTASection;
