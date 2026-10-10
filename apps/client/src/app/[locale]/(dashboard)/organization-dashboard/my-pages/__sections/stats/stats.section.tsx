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
} from '../utils';
import type { StatsSectionProps, StatItem } from './types';

const colsMap: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
  '5': 'sm:grid-cols-2 lg:grid-cols-5',
};

const StatsSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      ...colorFields,
      accentColor: colorField(),
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'Stacked', value: 'stacked' },
      ]),
      columns: selectField([
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
        { label: '5 Columns', value: '5' },
      ]),
      numberSize: selectField([
        { label: 'Large', value: 'text-4xl' },
        { label: 'Extra Large', value: 'text-5xl' },
        { label: 'Huge', value: 'text-6xl' },
      ]),
      style: selectField([
        { label: 'Simple', value: 'simple' },
        { label: 'Glass Cards', value: 'glass' },
        { label: 'Solid Cards', value: 'cards' },
        { label: 'Minimal Border', value: 'minimal' },
        { label: 'White Cards', value: 'bold' },
      ]),
      showIcons: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showDividers: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      stats: arrayField({
        number: textField(true),
        suffix: textField(true),
        label: textField(true),
        description: textField(true),
        icon: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Our Impact in Numbers',
      subtitle: 'Join thousands of learners who are transforming their careers',
      backgroundColor: '#6d28d9',
      textColor: '#ffffff',
      accentColor: '#fbbf24',
      layout: 'grid',
      columns: '4',
      numberSize: 'text-5xl',
      style: 'simple',
      showIcons: 'yes',
      showDividers: 'yes',
      stats: [
        {
          number: '10,000',
          suffix: '+',
          label: 'Active Students',
          description: 'Learning worldwide',
          icon: '👨‍🎓',
        },
        {
          number: '500',
          suffix: '+',
          label: 'Expert Courses',
          description: 'Across all categories',
          icon: '📚',
        },
        {
          number: '95',
          suffix: '%',
          label: 'Satisfaction Rate',
          description: 'From our students',
          icon: '⭐',
        },
        {
          number: '50',
          suffix: '+',
          label: 'Industry Experts',
          description: 'Teaching live',
          icon: '🎯',
        },
      ],
    },
    render: ({
      title,
      subtitle,
      backgroundColor,
      textColor,
      accentColor,
      layout,
      columns,
      numberSize,
      showIcons,
      showDividers,
      style,
      stats,
      ...props
    }: StatsSectionProps) => {
      const styleProps = getStyleProps(props);
      const statsArray: StatItem[] = Array.isArray(stats) ? stats : [];

      const cardWrapClass =
        {
          simple: 'text-center',
          glass:
            'text-center rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm hover:bg-white/15 transition-all duration-300',
          cards:
            'text-center rounded-2xl bg-white/15 p-8 hover:bg-white/25 transition-all duration-300',
          minimal: 'text-center border-b-2 pb-6',
          bold: 'text-center rounded-2xl bg-white p-8 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300',
        }[style ?? 'simple'] ?? 'text-center';

      const isWhiteCard = style === 'bold';
      const numColor = isWhiteCard ? (accentColor ?? '#6d28d9') : (accentColor ?? '#fbbf24');
      const labelColor = isWhiteCard ? '#111827' : textColor;
      const descColor = isWhiteCard ? '#6b7280' : textColor;

      const gridClass =
        layout === 'stacked'
          ? 'flex flex-col max-w-md mx-auto gap-6'
          : `grid grid-cols-1 gap-6 ${colsMap[columns ?? '4'] ?? 'sm:grid-cols-2 lg:grid-cols-4'}`;

      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            {title || subtitle ? (
              <div className="mb-16 text-center">
                {title ? (
                  <h2
                    className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
                    style={{ color: textColor }}>
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p
                    className="mx-auto max-w-2xl text-lg leading-relaxed opacity-80"
                    style={{ color: textColor }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className={gridClass}>
              {statsArray.map((stat, idx) => (
                <div
                  key={idx}
                  className={`relative ${cardWrapClass}`}
                  style={
                    style === 'minimal' ? { borderBottomColor: accentColor ?? '#fbbf24' } : {}
                  }>
                  {showIcons === 'yes' && stat.icon ? (
                    <div className="mb-4 text-4xl leading-none">{stat.icon}</div>
                  ) : null}
                  <div
                    className={`${numberSize ?? 'text-5xl'} mb-2 leading-none font-extrabold tracking-tight`}
                    style={{ color: numColor }}>
                    {stat.number}
                    {stat.suffix}
                  </div>
                  <div className="mb-1 text-lg font-bold" style={{ color: labelColor }}>
                    {stat.label}
                  </div>
                  {stat.description ? (
                    <div
                      className="text-sm leading-relaxed opacity-70"
                      style={{ color: descColor }}>
                      {stat.description}
                    </div>
                  ) : null}

                  {showDividers === 'yes' &&
                    idx < statsArray.length - 1 &&
                    layout !== 'stacked' &&
                    style === 'simple' && (
                      <div
                        className="absolute top-1/2 -right-3 hidden h-12 w-px -translate-y-1/2 lg:block"
                        style={{ backgroundColor: textColor, opacity: 0.25 }}
                      />
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default StatsSection;
