import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  imageField,
  numberField,
  selectField,
  textField,
  textareaField,
  buttonFields,
  secondaryButtonFields,
  colorField,
  alignmentField,
  animationField,
  linkField,
} from '../utils';
import type { HeroSectionProps, HeroWithVideoProps } from './types';
import { useTranslations } from 'next-intl';

const alignMap = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

const heightMap: Record<string, string> = {
  '400': 'min-h-[400px]',
  '500': 'min-h-[500px]',
  '600': 'min-h-[600px]',
  '800': 'min-h-[800px]',
  screen: 'min-h-screen',
};

export const HeroSection = () => {
  return {
    fields: {
      ...styleFields,
      eyebrow: textField(true),
      title: textField(true),
      titleSize: selectField([
        { label: 'Large', value: 'text-4xl md:text-5xl lg:text-6xl' },
        { label: 'Extra Large', value: 'text-5xl md:text-6xl lg:text-7xl' },
        { label: 'Massive', value: 'text-6xl md:text-7xl lg:text-8xl' },
      ]),
      subtitle: textareaField(true),
      subtitleSize: selectField([
        { label: 'Small', value: 'text-base md:text-lg' },
        { label: 'Medium', value: 'text-lg md:text-xl' },
        { label: 'Large', value: 'text-xl md:text-2xl' },
      ]),
      ...buttonFields,
      ...secondaryButtonFields,
      backgroundImage: imageField,
      backgroundStyle: selectField([
        { label: 'Solid Color', value: 'solid' },
        { label: 'Gradient', value: 'gradient' },
        { label: 'Image', value: 'image' },
      ]),
      backgroundColor: colorField(),
      gradientFrom: colorField(),
      gradientTo: colorField(),
      textColor: colorField(),
      accentColor: colorField(),
      alignment: alignmentField,
      overlayOpacity: numberField(0, 1),
      height: selectField([
        { label: 'Medium (500px)', value: '500' },
        { label: 'Large (600px)', value: '600' },
        { label: 'Extra Large (800px)', value: '800' },
        { label: 'Full Screen', value: 'screen' },
      ]),
      showScrollIndicator: selectField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      animation: animationField,
      badgeText: textField(true),
      badgeIcon: textField(true),
    },
    defaultProps: {
      ...defaultStyleProps,
      eyebrow: 'Welcome to our platform',
      title: 'Transform Your Learning Journey',
      titleSize: 'text-5xl md:text-6xl lg:text-7xl',
      subtitle: 'Access world-class courses and expert instructors from anywhere in the world',
      subtitleSize: 'text-lg md:text-xl',
      ctaText: 'Get Started Free',
      ctaLink: '#',
      buttonStyle: 'rounded-full',
      buttonSize: 'px-8 py-4 text-lg',
      secondaryCtaText: 'Watch Demo',
      secondaryCtaLink: '#',
      backgroundStyle: 'gradient',
      backgroundColor: '#667eea',
      gradientFrom: '#667eea',
      gradientTo: '#764ba2',
      textColor: '#ffffff',
      accentColor: '#fbbf24',
      alignment: 'center',
      overlayOpacity: 0.45,
      height: '600',
      showScrollIndicator: 'yes',
      animation: 'fade',
      badgeText: 'New: Summer Course Bundle',
      badgeIcon: '🔥',
    },
    render: function HeroSectionRender({
      eyebrow,
      title,
      titleSize,
      subtitle,
      subtitleSize,
      ctaText,
      ctaLink,
      buttonStyle,
      buttonSize,
      secondaryCtaText,
      secondaryCtaLink,
      backgroundImage,
      backgroundStyle,
      backgroundColor,
      gradientFrom,
      gradientTo,
      textColor,
      accentColor,
      alignment,
      overlayOpacity,
      height,
      showScrollIndicator,
      animation,
      badgeText,
      badgeIcon,
      ...props
    }: HeroSectionProps) {
      const styleProps = getStyleProps(props);
      const alignClass = alignMap[alignment ?? 'center'] ?? alignMap.center;
      const heightClass = heightMap[height ?? '600'] ?? 'min-h-[600px]';
      const animClass =
        animation === 'fade'
          ? 'animate-in fade-in duration-700'
          : animation === 'slide'
            ? 'animate-in slide-in-from-bottom-8 duration-700'
            : '';

      const bgStyle: React.CSSProperties = {
        ...(backgroundStyle === 'gradient'
          ? {
              background: `linear-gradient(135deg, ${gradientFrom ?? '#667eea'} 0%, ${gradientTo ?? '#764ba2'} 100%)`,
            }
          : { backgroundColor: backgroundColor ?? '#667eea' }),
        ...(backgroundStyle === 'image' && backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
      };

      return (
        <div
          className={`relative ${heightClass} flex items-center justify-center overflow-hidden`}
          style={{ ...styleProps, ...bgStyle }}>
          {backgroundStyle === 'image' && backgroundImage ? (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: overlayOpacity ?? 0.45 }}
            />
          ) : null}

          {/* Decorative blurred circles */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: accentColor ?? '#fbbf24' }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: textColor ?? '#ffffff' }}
          />

          <div
            className={`relative z-10 mx-auto flex w-full max-w-5xl flex-col px-6 sm:px-10 ${alignClass} ${animClass}`}>
            {badgeText ? (
              <div
                className={`mb-6 inline-flex items-center gap-2 self-${alignment === 'left' ? 'start' : alignment === 'right' ? 'end' : 'center'} rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-sm`}
                style={{
                  backgroundColor: `${accentColor ?? '#fbbf24'}25`,
                  color: accentColor ?? '#fbbf24',
                  border: `1px solid ${accentColor ?? '#fbbf24'}50`,
                }}>
                {badgeIcon ? <span>{badgeIcon}</span> : null}
                {badgeText}
              </div>
            ) : null}
            {eyebrow ? (
              <p
                className="mb-4 text-sm font-bold tracking-widest uppercase"
                style={{ color: accentColor ?? '#fbbf24' }}>
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={`${titleSize ?? 'text-5xl md:text-6xl lg:text-7xl'} mb-6 leading-tight font-extrabold tracking-tight`}
              style={{ color: textColor }}>
              {title}
            </h1>
            <p
              className={`${subtitleSize ?? 'text-lg md:text-xl'} mb-10 max-w-2xl leading-relaxed`}
              style={{ color: textColor, opacity: 0.88 }}>
              {subtitle}
            </p>
            <div
              className={`flex flex-col gap-4 sm:flex-row ${alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : ''}`}>
              <a
                href={ctaLink ?? '#'}
                className={`inline-flex items-center justify-center gap-2 font-bold shadow-2xl transition-all duration-200 hover:scale-105 hover:shadow-lg ${buttonSize ?? 'px-8 py-4 text-lg'} ${buttonStyle ?? 'rounded-full'}`}
                style={{ backgroundColor: accentColor ?? '#fbbf24', color: '#1f2937' }}>
                {ctaText}
              </a>
              {secondaryCtaText ? (
                <a
                  href={secondaryCtaLink ?? '#'}
                  className={`inline-flex items-center justify-center gap-2 border-2 font-semibold backdrop-blur-sm transition-all duration-200 hover:bg-white/10 ${buttonSize ?? 'px-8 py-4 text-lg'} ${buttonStyle ?? 'rounded-full'}`}
                  style={{ borderColor: `${textColor ?? '#ffffff'}60`, color: textColor }}>
                  {secondaryCtaText}
                </a>
              ) : null}
            </div>
          </div>

          {showScrollIndicator === 'yes' && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
              <div
                className="flex h-10 w-6 justify-center rounded-full border-2 pt-2"
                style={{ borderColor: `${textColor ?? '#ffffff'}60` }}>
                <div className="h-2 w-1 rounded-full" style={{ backgroundColor: textColor }} />
              </div>
            </div>
          )}
        </div>
      );
    },
  };
};

export const HeroWithVideo = () => {
  return {
    fields: {
      ...styleFields,
      eyebrow: textField(true),
      title: textField(true),
      titleSize: selectField([
        { label: 'Large', value: 'text-4xl md:text-5xl' },
        { label: 'Extra Large', value: 'text-5xl md:text-6xl' },
        { label: 'Massive', value: 'text-6xl md:text-7xl' },
      ]),
      subtitle: textareaField(true),
      subtitleSize: selectField([
        { label: 'Small', value: 'text-base md:text-lg' },
        { label: 'Medium', value: 'text-lg md:text-xl' },
        { label: 'Large', value: 'text-xl md:text-2xl' },
      ]),
      videoUrl: linkField(),
      ...buttonFields,
      ...secondaryButtonFields,
      overlayOpacity: numberField(0, 1),
      backgroundColor: colorField(),
      textColor: colorField(),
      accentColor: colorField(),
      layout: selectField([
        { label: 'Video Right', value: 'right' },
        { label: 'Video Left', value: 'left' },
        { label: 'Video Background', value: 'background' },
      ]),
      videoAspectRatio: selectField([
        { label: '16:9', value: 'aspect-video' },
        { label: '4:3', value: 'aspect-[4/3]' },
        { label: '1:1', value: 'aspect-square' },
      ]),
      showPlayBadge: selectField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
    },
    defaultProps: {
      ...defaultStyleProps,
      eyebrow: 'Trusted by 10,000+ learners',
      title: 'Learn From the Best',
      titleSize: 'text-5xl md:text-6xl',
      subtitle: 'Watch our introduction and discover how our platform can transform your learning',
      subtitleSize: 'text-lg md:text-xl',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      ctaText: 'Start Learning',
      ctaLink: '#',
      buttonStyle: 'rounded-full',
      buttonSize: 'px-8 py-4 text-lg',
      secondaryCtaText: 'View Courses',
      secondaryCtaLink: '#',
      overlayOpacity: 0.3,
      backgroundColor: '#0f0a1e',
      textColor: '#ffffff',
      accentColor: '#a78bfa',
      layout: 'right',
      videoAspectRatio: 'aspect-video',
      showPlayBadge: 'yes',
    },
    render: function HeroWithVideoRender({
      eyebrow,
      title,
      titleSize,
      subtitle,
      subtitleSize,
      videoUrl,
      ctaText,
      ctaLink,
      buttonStyle,
      buttonSize,
      secondaryCtaText,
      secondaryCtaLink,
      overlayOpacity,
      backgroundColor,
      textColor,
      accentColor,
      layout,
      videoAspectRatio,
      showPlayBadge,
      ...props
    }: HeroWithVideoProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);

      if (layout === 'background') {
        return (
          <div
            className="relative flex min-h-screen items-center justify-center overflow-hidden"
            style={styleProps}>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover">
              <source src={videoUrl} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity ?? 0.5 }} />
            <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
              {eyebrow ? (
                <p
                  className="mb-4 text-sm font-bold tracking-widest uppercase"
                  style={{ color: accentColor ?? '#a78bfa' }}>
                  {eyebrow}
                </p>
              ) : null}
              <h1
                className={`${titleSize ?? 'text-5xl md:text-6xl'} mb-6 leading-tight font-extrabold`}
                style={{ color: textColor }}>
                {title}
              </h1>
              <p
                className={`${subtitleSize ?? 'text-lg md:text-xl'} mb-10 opacity-90`}
                style={{ color: textColor }}>
                {subtitle}
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href={ctaLink ?? '#'}
                  className={`font-bold transition-all hover:scale-105 ${buttonSize ?? 'px-8 py-4 text-lg'} ${buttonStyle ?? 'rounded-full'}`}
                  style={{ backgroundColor: accentColor ?? '#a78bfa', color: '#0f0a1e' }}>
                  {ctaText}
                </a>
                {secondaryCtaText ? (
                  <a
                    href={secondaryCtaLink ?? '#'}
                    className={`border-2 font-semibold transition-all hover:bg-white/10 ${buttonSize ?? 'px-8 py-4 text-lg'} ${buttonStyle ?? 'rounded-full'}`}
                    style={{ borderColor: `${textColor ?? '#ffffff'}60`, color: textColor }}>
                    {secondaryCtaText}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        );
      }

      const isLeft = layout === 'left';

      return (
        <div className="px-6 py-16 sm:px-10 sm:py-24" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div
              className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 ${isLeft ? 'lg:[&>*:first-child]:order-2' : ''}`}>
              <div style={{ color: textColor }}>
                {eyebrow ? (
                  <p
                    className="mb-4 text-sm font-bold tracking-widest uppercase"
                    style={{ color: accentColor ?? '#a78bfa' }}>
                    {eyebrow}
                  </p>
                ) : null}
                <h1
                  className={`${titleSize ?? 'text-5xl md:text-6xl'} mb-6 leading-tight font-extrabold tracking-tight`}>
                  {title}
                </h1>
                <p
                  className={`${subtitleSize ?? 'text-lg md:text-xl'} mb-8 leading-relaxed opacity-85`}>
                  {subtitle}
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <a
                    href={ctaLink ?? '#'}
                    className={`inline-flex items-center justify-center font-bold transition-all hover:scale-105 ${buttonSize ?? 'px-8 py-4 text-lg'} ${buttonStyle ?? 'rounded-full'}`}
                    style={{ backgroundColor: accentColor ?? '#a78bfa', color: '#0f0a1e' }}>
                    {ctaText}
                  </a>
                  {secondaryCtaText ? (
                    <a
                      href={secondaryCtaLink ?? '#'}
                      className={`inline-flex items-center justify-center border-2 font-semibold transition-all hover:bg-white/10 ${buttonSize ?? 'px-8 py-4 text-lg'} ${buttonStyle ?? 'rounded-full'}`}
                      style={{ borderColor: `${textColor ?? '#ffffff'}60`, color: textColor }}>
                      {secondaryCtaText}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="relative">
                <div
                  className={`relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 ${videoAspectRatio ?? 'aspect-video'}`}>
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={videoUrl}
                    title={t('video')}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-scripts allow-presentation"
                  />
                </div>
                {showPlayBadge === 'yes' && (
                  <div
                    className="absolute -right-4 -bottom-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-xl"
                    style={{ backgroundColor: accentColor ?? '#a78bfa', color: '#0f0a1e' }}>
                    <span>▶</span> {t('watchIntro')}
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
