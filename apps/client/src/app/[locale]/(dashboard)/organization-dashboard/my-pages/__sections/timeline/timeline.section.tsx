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
} from '../utils';
import type { TimelineSectionProps, TimelineItem } from './types';

const TimelineSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      eyebrow: textField(true),
      ...colorFields,
      accentColor: colorField(),
      layout: selectField([
        { label: 'Vertical', value: 'vertical' },
        { label: 'Alternating', value: 'alternating' },
        { label: 'Horizontal', value: 'horizontal' },
      ]),
      nodeStyle: selectField([
        { label: 'Circle with icon', value: 'icon' },
        { label: 'Year badge', value: 'year' },
        { label: 'Numbered', value: 'numbered' },
        { label: 'Dot', value: 'dot' },
      ]),
      connectorStyle: selectField([
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Gradient', value: 'gradient' },
      ]),
      items: arrayField({
        year: textField(true),
        title: textField(true),
        description: textareaField(true),
        icon: textField(true),
        tag: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Our Journey',
      subtitle: 'From humble beginnings to a global learning platform — here is our story',
      eyebrow: 'Milestones',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      layout: 'alternating',
      nodeStyle: 'icon',
      connectorStyle: 'gradient',
      items: [
        {
          year: '2019',
          title: 'Company Founded',
          description:
            'Started with a vision to make quality education accessible to everyone, everywhere.',
          icon: '🚀',
          tag: 'Milestone',
        },
        {
          year: '2020',
          title: 'First 1,000 Students',
          description:
            'Our community grew rapidly as we launched 20+ courses across technology and business.',
          icon: '🎓',
          tag: 'Growth',
        },
        {
          year: '2021',
          title: 'Global Expansion',
          description:
            'Expanded to 40+ countries with multilingual support and regional content partnerships.',
          icon: '🌍',
          tag: 'Expansion',
        },
        {
          year: '2022',
          title: '$5M Series A Funding',
          description:
            'Raised funding to accelerate product development and hire world-class instructors.',
          icon: '💰',
          tag: 'Funding',
        },
        {
          year: '2023',
          title: '100,000 Students',
          description:
            'Reached six figures of active learners with a 95% satisfaction rate across all courses.',
          icon: '⭐',
          tag: 'Achievement',
        },
        {
          year: '2024',
          title: 'AI-Powered Learning',
          description:
            "Launched adaptive learning paths powered by AI to personalize every student's journey.",
          icon: '🤖',
          tag: 'Innovation',
        },
      ],
    },
    render: ({
      title,
      subtitle,
      eyebrow,
      backgroundColor,
      textColor,
      accentColor,
      layout,
      nodeStyle,
      connectorStyle,
      items,
      ...props
    }: TimelineSectionProps) => {
      const styleProps = getStyleProps(props);
      const itemsArr: TimelineItem[] = Array.isArray(items) ? items : [];
      const primary = accentColor ?? '#7c3aed';

      function renderNode(item: TimelineItem, idx: number) {
        if (nodeStyle === 'numbered') {
          return (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-lg ring-4 ring-white"
              style={{ backgroundColor: primary }}>
              {idx + 1}
            </div>
          );
        }
        if (nodeStyle === 'year') {
          return (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-lg"
              style={{ backgroundColor: primary }}>
              {item.year}
            </div>
          );
        }
        if (nodeStyle === 'dot') {
          return (
            <div
              className="h-5 w-5 rounded-full shadow-md ring-4 ring-white"
              style={{ backgroundColor: primary }}
            />
          );
        }
        // icon (default)
        return (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-xl ring-4 ring-white"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, #4f46e5 100%)` }}>
            {item.icon ?? '•'}
          </div>
        );
      }

      const connectorClass =
        connectorStyle === 'dashed' ? 'border-dashed border-2' : 'bg-gradient-to-b';
      const connectorStyle2: React.CSSProperties =
        connectorStyle === 'dashed'
          ? { borderColor: `${primary}40` }
          : {
              background: `linear-gradient(to bottom, ${primary}, #4f46e5)`,
              opacity: 0.3,
              width: '2px',
            };

      if (layout === 'horizontal') {
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
                  className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
                  style={{ color: textColor }}>
                  {title}
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
              </div>
              <div className="overflow-x-auto pb-4">
                <div className="flex min-w-max items-start gap-0">
                  {itemsArr.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center"
                      style={{ minWidth: '200px' }}>
                      <div className="flex w-full items-center">
                        <div
                          className={`flex-1 ${idx === 0 ? 'invisible' : 'h-0.5'}`}
                          style={{ backgroundColor: `${primary}30` }}
                        />
                        <div className="mx-2">{renderNode(item, idx)}</div>
                        <div
                          className={`flex-1 ${idx === itemsArr.length - 1 ? 'invisible' : 'h-0.5'}`}
                          style={{ backgroundColor: `${primary}30` }}
                        />
                      </div>
                      <div className="mt-4 max-w-[180px] text-center">
                        {item.tag ? (
                          <span
                            className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: primary }}>
                            {item.tag}
                          </span>
                        ) : null}
                        <h3 className="mb-1 text-sm font-extrabold" style={{ color: textColor }}>
                          {item.title}
                        </h3>
                        <p className="text-xs leading-relaxed text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (layout === 'alternating') {
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-5xl">
              <div className="mb-16 text-center">
                {eyebrow ? (
                  <p
                    className="mb-3 text-sm font-extrabold tracking-widest uppercase"
                    style={{ color: primary }}>
                    {eyebrow}
                  </p>
                ) : null}
                <h2
                  className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
                  style={{ color: textColor }}>
                  {title}
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
              </div>

              <div className="relative">
                {/* Center line */}
                <div
                  className="absolute top-0 bottom-0 left-1/2 hidden w-0.5 -translate-x-1/2 md:block"
                  style={{
                    background: `linear-gradient(to bottom, transparent, ${primary}40, transparent)`,
                  }}
                />

                <div className="space-y-10">
                  {itemsArr.map((item, idx) => {
                    const isLeft = idx % 2 === 0;
                    return (
                      <div
                        key={idx}
                        className={`relative flex flex-col md:flex-row ${isLeft ? '' : 'md:flex-row-reverse'} items-center gap-6 md:gap-0`}>
                        {/* Content */}
                        <div
                          className={`w-full rounded-2xl bg-white p-6 shadow-md transition-all hover:shadow-xl md:w-[calc(50%-3rem)] ${isLeft ? 'md:mr-12' : 'md:ml-12'}`}>
                          {item.tag ? (
                            <span
                              className="mb-3 inline-block rounded-full px-3 py-0.5 text-xs font-bold text-white"
                              style={{ backgroundColor: primary }}>
                              {item.tag}
                            </span>
                          ) : null}
                          {nodeStyle === 'year' && item.year ? (
                            <p
                              className="mb-1 text-xs font-bold tracking-widest uppercase"
                              style={{ color: primary }}>
                              {item.year}
                            </p>
                          ) : null}
                          <h3 className="mb-2 text-xl font-extrabold" style={{ color: textColor }}>
                            {item.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-gray-500">
                            {item.description}
                          </p>
                        </div>

                        {/* Node */}
                        <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 md:block">
                          {renderNode(item, idx)}
                        </div>

                        {/* Spacer */}
                        <div className="hidden md:block md:w-[calc(50%-3rem)]" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Vertical (default)
      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-3xl">
            <div className="mb-16 text-center">
              {eyebrow ? (
                <p
                  className="mb-3 text-sm font-extrabold tracking-widest uppercase"
                  style={{ color: primary }}>
                  {eyebrow}
                </p>
              ) : null}
              <h2
                className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
                style={{ color: textColor }}>
                {title}
              </h2>
              <p className="text-lg text-gray-500">{subtitle}</p>
            </div>

            <div className="relative space-y-0">
              {itemsArr.map((item, idx) => (
                <div key={idx} className="relative flex gap-6">
                  {/* Left: node + line */}
                  <div className="flex flex-col items-center">
                    {renderNode(item, idx)}
                    {idx < itemsArr.length - 1 && (
                      <div
                        className={`mt-2 flex-1 ${connectorClass}`}
                        style={
                          connectorStyle === 'dashed'
                            ? connectorStyle2
                            : { ...connectorStyle2, height: '100%' }
                        }
                      />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className={`pb-10 ${idx === itemsArr.length - 1 ? 'pb-0' : ''}`}>
                    {item.tag ? (
                      <span
                        className="mb-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold text-white"
                        style={{ backgroundColor: primary }}>
                        {item.tag}
                      </span>
                    ) : null}
                    {nodeStyle !== 'year' && item.year ? (
                      <p
                        className="mb-1 text-xs font-bold tracking-widest uppercase"
                        style={{ color: primary }}>
                        {item.year}
                      </p>
                    ) : null}
                    <h3 className="mb-2 text-xl font-extrabold" style={{ color: textColor }}>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default TimelineSection;
