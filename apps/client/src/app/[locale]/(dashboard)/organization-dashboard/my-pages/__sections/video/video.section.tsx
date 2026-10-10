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
  linkField,
} from '../utils';
import type { VideoSectionProps } from './types';
import { useTranslations } from 'next-intl';

const VideoSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      eyebrow: textField(true),
      videoUrl: linkField(),
      ...colorFields,
      accentColor: colorField(),
      aspectRatio: selectField([
        { label: '16:9 (widescreen)', value: 'aspect-video' },
        { label: '4:3 (classic)', value: 'aspect-4/3' },
        { label: '1:1 (square)', value: 'aspect-square' },
        { label: '9:16 (portrait)', value: 'aspect-9/16' },
      ]),
      maxWidth: selectField([
        { label: 'Narrow (640px)', value: 'max-w-xl' },
        { label: 'Medium (768px)', value: 'max-w-3xl' },
        { label: 'Wide (1024px)', value: 'max-w-4xl' },
        { label: 'Full (1280px)', value: 'max-w-6xl' },
      ]),
      borderRadius: selectField([
        { label: 'None', value: 'rounded-none' },
        { label: 'Rounded', value: 'rounded-xl' },
        { label: 'Large Rounded', value: 'rounded-2xl' },
        { label: 'Extra Rounded', value: 'rounded-3xl' },
      ]),
      shadow: selectField([
        { label: 'None', value: '' },
        { label: 'Small', value: 'shadow-md' },
        { label: 'Large', value: 'shadow-2xl' },
        { label: 'Colored', value: 'shadow-xl shadow-purple-200' },
      ]),
      border: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      alignment: selectField([
        { label: 'Left', value: 'mr-auto' },
        { label: 'Center', value: 'mx-auto' },
        { label: 'Right', value: 'ml-auto' },
      ]),
      showDecorator: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'See Our Platform in Action',
      subtitle:
        'Watch a quick overview of how our learning platform works and what makes it different.',
      eyebrow: 'Product tour',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      aspectRatio: 'aspect-video',
      maxWidth: 'max-w-4xl',
      borderRadius: 'rounded-2xl',
      shadow: 'shadow-2xl',
      border: 'no',
      alignment: 'mx-auto',
      showDecorator: 'yes',
    },
    render: function VideoSectionRender({
      title,
      subtitle,
      eyebrow,
      videoUrl,
      backgroundColor,
      textColor,
      accentColor,
      aspectRatio,
      maxWidth,
      borderRadius,
      shadow,
      border,
      alignment,
      showDecorator,
      ...props
    }: VideoSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const primary = accentColor ?? '#7c3aed';

      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            {eyebrow || title || subtitle ? (
              <div className="mb-12 text-center">
                {eyebrow ? (
                  <p
                    className="mb-3 text-sm font-extrabold tracking-widest uppercase"
                    style={{ color: primary }}>
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <h2
                    className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
                    style={{ color: textColor }}>
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
                ) : null}
              </div>
            ) : null}

            <div className={`relative ${maxWidth ?? 'max-w-4xl'} ${alignment ?? 'mx-auto'}`}>
              {showDecorator === 'yes' && (
                <div
                  className={`absolute -right-3 -bottom-3 -z-10 h-full w-full opacity-20 ${borderRadius ?? 'rounded-2xl'}`}
                  style={{ backgroundColor: primary }}
                />
              )}
              <div
                className={`relative overflow-hidden ${aspectRatio ?? 'aspect-video'} ${borderRadius ?? 'rounded-2xl'} ${shadow ?? 'shadow-2xl'}`}
                style={border === 'yes' ? { border: `2px solid ${primary}30` } : {}}>
                {videoUrl ? (
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={videoUrl}
                    title={t('videoPlayer')}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-scripts allow-presentation"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primary}15 0%, #4f46e510 100%)`,
                    }}>
                    <div className="text-center">
                      <div className="mb-3 text-5xl opacity-40">▶</div>
                      <p className="text-sm text-gray-400">{t('pasteEmbedUrl')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
  };
};

export default VideoSection;
