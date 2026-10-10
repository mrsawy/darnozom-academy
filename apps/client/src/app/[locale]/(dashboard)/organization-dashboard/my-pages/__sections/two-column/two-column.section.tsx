/* eslint-disable @next/next/no-img-element */
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
  arrayField,
  imageField,
  linkField,
  buttonFields,
} from '../utils';
import type { TwoColumnSectionProps, BulletItem } from './types';
import { useTranslations } from 'next-intl';

const TwoColumnSection = () => {
  return {
    fields: {
      ...styleFields,
      eyebrow: textField(true),
      title: textField(true),
      titleSize: selectField([
        { label: 'Medium', value: 'text-3xl md:text-4xl' },
        { label: 'Large', value: 'text-4xl md:text-5xl' },
        { label: 'Extra Large', value: 'text-5xl md:text-6xl' },
      ]),
      body: textareaField(true),
      ...buttonFields,
      secondaryCtaText: textField(true),
      secondaryCtaLink: linkField(),
      ...colorFields,
      accentColor: colorField(),
      media: imageField,
      videoUrl: linkField(),
      mediaType: selectField([
        { label: 'Image', value: 'image' },
        { label: 'Video (embed)', value: 'video' },
      ]),
      mediaRadius: selectField([
        { label: 'None', value: 'rounded-none' },
        { label: 'Rounded', value: 'rounded-xl' },
        { label: 'Large Rounded', value: 'rounded-3xl' },
        { label: 'Circle', value: 'rounded-full' },
      ]),
      mediaShadow: selectField([
        { label: 'None', value: '' },
        { label: 'Small', value: 'shadow-md' },
        { label: 'Large', value: 'shadow-2xl' },
        { label: 'Colored', value: 'shadow-xl shadow-purple-200' },
      ]),
      layout: selectField([
        { label: 'Text Left, Media Right', value: 'text-left' },
        { label: 'Text Right, Media Left', value: 'text-right' },
        { label: 'Text Left, No Media', value: 'text-only' },
        { label: 'Stacked (mobile-first)', value: 'stacked' },
      ]),
      verticalAlign: selectField([
        { label: 'Top', value: 'items-start' },
        { label: 'Center', value: 'items-center' },
        { label: 'Bottom', value: 'items-end' },
      ]),
      showDecorator: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      bullets: arrayField({
        text: textField(true),
        icon: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      eyebrow: 'Why us',
      title: 'Learn Smarter, Not Harder',
      titleSize: 'text-4xl md:text-5xl',
      body: 'Our adaptive learning platform personalizes your experience based on your goals, pace, and learning style — making every minute of study count.',
      ctaText: 'Start Learning',
      ctaLink: '#',
      buttonStyle: 'rounded-full',
      buttonSize: 'px-7 py-3 text-sm',
      secondaryCtaText: 'See how it works',
      secondaryCtaLink: '#',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      media: '',
      videoUrl: '',
      mediaType: 'image',
      mediaRadius: 'rounded-3xl',
      mediaShadow: 'shadow-2xl',
      layout: 'text-left',
      verticalAlign: 'items-center',
      showDecorator: 'yes',
      bullets: [
        { text: 'Personalized learning paths tailored to your goals', icon: '✦' },
        { text: 'Expert-led courses with real-world projects', icon: '✦' },
        { text: 'Join a global community of motivated learners', icon: '✦' },
        { text: 'Earn certificates recognized by top employers', icon: '✦' },
      ],
    },
    render: function TwoColumnRender({
      eyebrow,
      title,
      titleSize,
      body,
      ctaText,
      ctaLink,
      buttonStyle,
      buttonSize,
      secondaryCtaText,
      secondaryCtaLink,
      backgroundColor,
      textColor,
      accentColor,
      media,
      videoUrl,
      mediaType,
      mediaRadius,
      mediaShadow,
      layout,
      verticalAlign,
      showDecorator,
      bullets,
      ...props
    }: TwoColumnSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const primary = accentColor ?? '#7c3aed';
      const bulletsArr: BulletItem[] = Array.isArray(bullets) ? bullets : [];
      const isReversed = layout === 'text-right';

      const mediaEl =
        mediaType === 'video' && videoUrl ? (
          <div
            className={`relative aspect-video overflow-hidden ${mediaRadius ?? 'rounded-3xl'} ${mediaShadow ?? 'shadow-2xl'}`}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={videoUrl}
              title={t('video')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-presentation"
            />
          </div>
        ) : media ? (
          <div className="relative">
            {showDecorator === 'yes' && (
              <div
                className={`absolute -right-4 -bottom-4 -z-10 h-full w-full ${mediaRadius ?? 'rounded-3xl'} opacity-20`}
                style={{ backgroundColor: primary }}
              />
            )}
            <img
              src={media}
              alt={title ?? ''}
              className={`w-full object-cover ${mediaRadius ?? 'rounded-3xl'} ${mediaShadow ?? 'shadow-2xl'}`}
            />
          </div>
        ) : (
          <div
            className={`flex aspect-4/3 w-full items-center justify-center ${mediaRadius ?? 'rounded-3xl'} ${mediaShadow ?? 'shadow-2xl'}`}
            style={{
              background: `linear-gradient(135deg, ${primary}20 0%, #4f46e520 100%)`,
              border: `2px dashed ${primary}30`,
            }}>
            <p className="text-sm text-gray-400">{t('addImageOrVideo')}</p>
          </div>
        );

      const textEl = (
        <div style={{ color: textColor }}>
          {eyebrow ? (
            <p
              className="mb-4 text-sm font-extrabold tracking-widest uppercase"
              style={{ color: primary }}>
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`${titleSize ?? 'text-4xl md:text-5xl'} mb-5 leading-tight font-extrabold tracking-tight`}>
            {title}
          </h2>
          {body ? <p className="mb-7 text-lg leading-relaxed text-gray-500">{body}</p> : null}
          {bulletsArr.length > 0 && (
            <ul className="mb-8 space-y-3">
              {bulletsArr.map((b, idx) => (
                <li key={idx} className="flex items-start gap-3 text-base text-gray-600">
                  <span
                    className="mt-0.5 shrink-0 text-sm leading-none font-extrabold"
                    style={{ color: primary }}>
                    {b.icon ?? '✦'}
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3">
            {ctaText ? (
              <a
                href={ctaLink ?? '#'}
                className={`inline-flex items-center font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl ${buttonSize ?? 'px-7 py-3 text-sm'} ${buttonStyle ?? 'rounded-full'}`}
                style={{ backgroundColor: primary }}>
                {ctaText}
              </a>
            ) : null}
            {secondaryCtaText ? (
              <a
                href={secondaryCtaLink ?? '#'}
                className={`inline-flex items-center font-semibold transition-all hover:underline ${buttonSize ?? 'px-7 py-3 text-sm'} ${buttonStyle ?? 'rounded-full'}`}
                style={{ color: primary }}>
                {secondaryCtaText} →
              </a>
            ) : null}
          </div>
        </div>
      );

      if (layout === 'text-only') {
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-3xl">{textEl}</div>
          </div>
        );
      }

      if (layout === 'stacked') {
        return (
          <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-4xl space-y-12">
              {textEl}
              {mediaEl}
            </div>
          </div>
        );
      }

      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div
              className={`grid grid-cols-1 gap-12 lg:grid-cols-2 ${verticalAlign ?? 'items-center'}`}>
              <div className={isReversed ? 'lg:order-2' : ''}>{textEl}</div>
              <div className={isReversed ? 'lg:order-1' : ''}>{mediaEl}</div>
            </div>
          </div>
        </div>
      );
    },
  };
};

export default TwoColumnSection;
