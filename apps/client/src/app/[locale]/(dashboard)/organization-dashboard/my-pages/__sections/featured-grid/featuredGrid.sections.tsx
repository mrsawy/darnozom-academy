import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  colorFields,
  radioField,
  selectField,
  arrayField,
  imageField,
  linkField,
} from '../utils';
import type { FeatureGridSectionProps, FeatureItem } from './types';
import { useTranslations } from 'next-intl';

const colsMap: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
};

const FeatureGridSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      eyebrow: textField(true),
      ...colorFields,
      accentColor: colorField(),
      columns: selectField([
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ]),
      cardStyle: selectField([
        { label: 'Elevated (shadow)', value: 'elevated' },
        { label: 'Flat (no shadow)', value: 'flat' },
        { label: 'Bordered', value: 'bordered' },
        { label: 'Gradient Accent', value: 'gradient' },
        { label: 'Minimal Left-border', value: 'minimal' },
      ]),
      iconPosition: selectField([
        { label: 'Top', value: 'top' },
        { label: 'Left', value: 'left' },
      ]),
      iconSize: selectField([
        { label: 'Small', value: 'text-3xl' },
        { label: 'Medium', value: 'text-4xl' },
        { label: 'Large', value: 'text-5xl' },
      ]),
      showArrow: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      hoverEffect: selectField([
        { label: 'Lift', value: 'lift' },
        { label: 'Glow', value: 'glow' },
        { label: 'Scale', value: 'scale' },
        { label: 'None', value: 'none' },
      ]),
      features: arrayField({
        title: textField(true),
        description: textareaField(true),
        icon: textField(true),
        image: imageField,
        link: linkField(),
        accentColor: colorField(),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Everything You Need to Succeed',
      subtitle:
        'Our platform is packed with powerful features designed to accelerate your learning journey',
      eyebrow: 'Features',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      columns: '3',
      cardStyle: 'elevated',
      iconPosition: 'top',
      iconSize: 'text-4xl',
      showArrow: 'yes',
      hoverEffect: 'lift',
      features: [
        {
          title: 'Expert Instructors',
          description:
            'Learn from industry professionals with years of real-world experience and proven teaching methods.',
          icon: '👨‍🏫',
          image: '',
          link: '',
          accentColor: '#7c3aed',
        },
        {
          title: 'Interactive Projects',
          description:
            'Apply your skills with hands-on projects that mirror real workplace challenges and build your portfolio.',
          icon: '🛠️',
          image: '',
          link: '',
          accentColor: '#0891b2',
        },
        {
          title: 'Live Mentorship',
          description:
            'Get personalized guidance from dedicated mentors who are invested in your individual success.',
          icon: '💬',
          image: '',
          link: '',
          accentColor: '#059669',
        },
        {
          title: 'Flexible Schedule',
          description:
            'Learn at your own pace with 24/7 access to all course materials from any device, anywhere.',
          icon: '⏰',
          image: '',
          link: '',
          accentColor: '#d97706',
        },
        {
          title: 'Community Access',
          description:
            'Join a thriving community of learners, share knowledge, and network with peers worldwide.',
          icon: '🌍',
          image: '',
          link: '',
          accentColor: '#dc2626',
        },
        {
          title: 'Certificates',
          description:
            'Earn industry-recognized certificates upon completion to boost your resume and career prospects.',
          icon: '🏆',
          image: '',
          link: '',
          accentColor: '#7c3aed',
        },
      ],
    },
    render: function FeaturedGridRender({
      title,
      subtitle,
      eyebrow,
      backgroundColor,
      textColor,
      accentColor,
      columns,
      cardStyle,
      iconPosition,
      iconSize,
      showArrow,
      hoverEffect,
      features,
      ...props
    }: FeatureGridSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const featuresArr: FeatureItem[] = Array.isArray(features) ? features : [];
      const primary = accentColor ?? '#7c3aed';

      const hoverClass =
        {
          lift: 'hover:-translate-y-2 hover:shadow-xl',
          glow: 'hover:shadow-lg hover:shadow-purple-100',
          scale: 'hover:scale-[1.02]',
          none: '',
        }[hoverEffect ?? 'lift'] ?? 'hover:-translate-y-2 hover:shadow-xl';

      const baseCard =
        {
          elevated: `bg-white rounded-2xl p-7 shadow-md transition-all duration-300 ${hoverClass}`,
          flat: `bg-white rounded-2xl p-7 transition-all duration-300 ${hoverClass}`,
          bordered: `bg-white rounded-2xl border-2 border-gray-100 p-7 transition-all duration-300 hover:border-purple-200 ${hoverClass}`,
          gradient: `rounded-2xl p-7 transition-all duration-300 ${hoverClass}`,
          minimal: `bg-white border-l-4 p-7 transition-all duration-300 ${hoverClass}`,
        }[cardStyle ?? 'elevated'] ??
        `bg-white rounded-2xl p-7 shadow-md transition-all duration-300 ${hoverClass}`;

      const gridClass = `grid grid-cols-1 gap-6 ${colsMap[columns ?? '3'] ?? 'sm:grid-cols-2 lg:grid-cols-3'}`;

      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              {eyebrow ? (
                <p
                  className="mb-3 text-sm font-extrabold tracking-widest uppercase"
                  style={{ color: primary }}>
                  {eyebrow}
                </p>
              ) : null}
              <h2
                className="mb-5 text-4xl font-extrabold tracking-tight md:text-5xl"
                style={{ color: textColor }}>
                {title}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
            </div>

            <div className={gridClass}>
              {featuresArr.map((feature, idx) => {
                const featureAccent = feature.accentColor ?? primary;
                const gradientStyle =
                  cardStyle === 'gradient'
                    ? {
                        background: `linear-gradient(135deg, ${featureAccent}10 0%, ${featureAccent}05 100%)`,
                        border: `1px solid ${featureAccent}20`,
                      }
                    : {};
                const minimalStyle =
                  cardStyle === 'minimal' ? { borderLeftColor: featureAccent } : {};

                return (
                  <div key={idx} className={baseCard} style={{ ...gradientStyle, ...minimalStyle }}>
                    {iconPosition === 'top' ? (
                      <>
                        <div
                          className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${iconSize ?? 'text-4xl'}`}
                          style={{ backgroundColor: `${featureAccent}15` }}>
                          <span>{feature.icon}</span>
                        </div>
                        <h3 className="mb-3 text-xl font-extrabold" style={{ color: textColor }}>
                          {feature.title}
                        </h3>
                        <p className="mb-4 text-sm leading-relaxed text-gray-500">
                          {feature.description}
                        </p>
                      </>
                    ) : (
                      <div className="flex gap-5">
                        <div
                          className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconSize ?? 'text-4xl'}`}
                          style={{ backgroundColor: `${featureAccent}15` }}>
                          <span>{feature.icon}</span>
                        </div>
                        <div>
                          <h3 className="mb-2 text-xl font-extrabold" style={{ color: textColor }}>
                            {feature.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-gray-500">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    )}
                    {showArrow === 'yes' && feature.link ? (
                      <a
                        href={feature.link}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-bold transition-all hover:gap-2"
                        style={{ color: featureAccent }}>
                        {t('learnMoreArrow')}
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default FeatureGridSection;
