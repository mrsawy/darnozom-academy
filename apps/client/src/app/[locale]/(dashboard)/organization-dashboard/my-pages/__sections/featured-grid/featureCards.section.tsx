import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  colorFields,
  selectField,
  arrayField,
  linkField,
} from '../utils';
import type { FeatureCardsSectionProps, FeatureCard } from './types';
import { useTranslations } from 'next-intl';

const colsMap: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
};

const FeatureCardsSection = () => {
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
        { label: 'Modern Shadow', value: 'modern' },
        { label: 'Glass', value: 'glass' },
        { label: 'Outlined', value: 'outlined' },
        { label: 'Filled Accent', value: 'filled' },
      ]),
      cards: arrayField({
        title: textField(true),
        description: textareaField(true),
        icon: textField(true),
        link: linkField(),
        accentColor: colorField(),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Why Choose Us',
      subtitle:
        'We combine cutting-edge technology with proven teaching methods to deliver exceptional results',
      eyebrow: 'Our Advantage',
      backgroundColor: '#f9fafb',
      textColor: '#111827',
      accentColor: '#7c3aed',
      columns: '3',
      cardStyle: 'modern',
      cards: [
        {
          title: 'Bite-sized Learning',
          description:
            'Short, focused lessons that fit into your busy schedule without overwhelming you.',
          icon: '🎯',
          link: '',
          accentColor: '#7c3aed',
        },
        {
          title: 'Progress Tracking',
          description:
            'Visual dashboards to monitor your learning progress and stay motivated throughout.',
          icon: '📊',
          link: '',
          accentColor: '#0891b2',
        },
        {
          title: 'Peer Collaboration',
          description:
            'Work alongside fellow students on group projects and build your professional network.',
          icon: '🤝',
          link: '',
          accentColor: '#059669',
        },
        {
          title: 'AI-Powered Quizzes',
          description:
            'Adaptive assessments that adjust to your level and pinpoint areas for improvement.',
          icon: '🤖',
          link: '',
          accentColor: '#d97706',
        },
        {
          title: 'Offline Access',
          description:
            'Download lessons and study without an internet connection, anywhere in the world.',
          icon: '📥',
          link: '',
          accentColor: '#dc2626',
        },
        {
          title: '24/7 Support',
          description:
            'Round-the-clock access to our support team and extensive knowledge base resources.',
          icon: '🎧',
          link: '',
          accentColor: '#7c3aed',
        },
      ],
    },
    render: function FeatureCardsRender({
      title,
      subtitle,
      eyebrow,
      backgroundColor,
      textColor,
      accentColor,
      columns,
      cardStyle,
      cards,
      ...props
    }: FeatureCardsSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const cardsArr: FeatureCard[] = Array.isArray(cards) ? cards : [];
      const primary = accentColor ?? '#7c3aed';
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
              {cardsArr.map((card, idx) => {
                const cardAccent = card.accentColor ?? primary;

                if (cardStyle === 'glass') {
                  return (
                    <div
                      key={idx}
                      className="group rounded-2xl border border-white/60 bg-white/70 p-7 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                      <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                        style={{ backgroundColor: `${cardAccent}15` }}>
                        {card.icon}
                      </div>
                      <h3 className="mb-2 text-lg font-extrabold" style={{ color: textColor }}>
                        {card.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-500">{card.description}</p>
                      {card.link ? (
                        <a
                          href={card.link}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-bold transition-all hover:gap-2"
                          style={{ color: cardAccent }}>
                          {t('learnMoreArrow')}
                        </a>
                      ) : null}
                    </div>
                  );
                }

                if (cardStyle === 'outlined') {
                  return (
                    <div
                      key={idx}
                      className="group rounded-2xl border-2 p-7 transition-all duration-300 hover:shadow-md"
                      style={{ borderColor: `${cardAccent}30` }}>
                      <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                        style={{ backgroundColor: `${cardAccent}10` }}>
                        {card.icon}
                      </div>
                      <h3 className="mb-2 text-lg font-extrabold" style={{ color: textColor }}>
                        {card.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-500">{card.description}</p>
                      {card.link ? (
                        <a
                          href={card.link}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-bold transition-all hover:gap-2"
                          style={{ color: cardAccent }}>
                          {t('learnMoreArrow')}
                        </a>
                      ) : null}
                    </div>
                  );
                }

                if (cardStyle === 'filled') {
                  return (
                    <div
                      key={idx}
                      className="group rounded-2xl p-7 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                      style={{
                        background: `linear-gradient(135deg, ${cardAccent} 0%, ${cardAccent}cc 100%)`,
                      }}>
                      <div className="mb-4 text-3xl">{card.icon}</div>
                      <h3 className="mb-2 text-lg font-extrabold">{card.title}</h3>
                      <p className="text-sm leading-relaxed opacity-85">{card.description}</p>
                      {card.link ? (
                        <a
                          href={card.link}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-white/80 underline-offset-2 transition-all hover:text-white hover:underline">
                          {t('learnMoreArrow')}
                        </a>
                      ) : null}
                    </div>
                  );
                }

                // Modern (default)
                return (
                  <div
                    key={idx}
                    className="group rounded-2xl bg-white p-7 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div
                      className="mb-5 flex h-13 w-13 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${cardAccent}15` }}>
                      {card.icon}
                    </div>
                    <h3 className="mb-2 text-lg font-extrabold" style={{ color: textColor }}>
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">{card.description}</p>
                    {card.link ? (
                      <a
                        href={card.link}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-bold transition-all hover:gap-2"
                        style={{ color: cardAccent }}>
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

export default FeatureCardsSection;
