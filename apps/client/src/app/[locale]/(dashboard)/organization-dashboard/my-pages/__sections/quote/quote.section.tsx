/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from 'react';
import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  colorFields,
  selectField,
  imageField,
  radioField,
} from '../utils';
import type { QuoteSectionProps } from './types';

const QuoteSection = () => {
  return {
    fields: {
      ...styleFields,
      quote: textareaField(true),
      author: textField(true),
      role: textField(true),
      company: textField(true),
      avatar: imageField,
      ...colorFields,
      accentColor: colorField(),
      style: selectField([
        { label: 'Classic (large quote mark)', value: 'classic' },
        { label: 'Card (boxed)', value: 'card' },
        { label: 'Banner (gradient)', value: 'banner' },
        { label: 'Minimal (left border)', value: 'minimal' },
        { label: 'Centered Large', value: 'centered' },
      ]),
      alignment: selectField([
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ]),
      quoteSize: selectField([
        { label: 'Small', value: 'text-lg' },
        { label: 'Medium', value: 'text-xl md:text-2xl' },
        { label: 'Large', value: 'text-2xl md:text-3xl' },
        { label: 'Extra Large', value: 'text-3xl md:text-4xl' },
      ]),
      showAvatar: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
    },
    defaultProps: {
      ...defaultStyleProps,
      quote:
        'Education is the most powerful weapon which you can use to change the world. Our platform makes world-class learning accessible to everyone.',
      author: 'Nelson Mandela',
      role: 'Former President',
      company: 'Republic of South Africa',
      avatar: '',
      backgroundColor: '#f5f3ff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      style: 'classic',
      alignment: 'center',
      quoteSize: 'text-xl md:text-2xl',
      showAvatar: 'yes',
    },
    render: ({
      quote,
      author,
      role,
      company,
      avatar,
      backgroundColor,
      textColor,
      accentColor,
      style,
      alignment,
      quoteSize,
      showAvatar,
      ...props
    }: QuoteSectionProps) => {
      const styleProps = getStyleProps(props);
      const primary = accentColor ?? '#7c3aed';
      const alignClass =
        { left: 'text-left', center: 'text-center', right: 'text-right' }[alignment ?? 'center'] ??
        'text-center';
      const itemsAlign =
        { left: 'items-start', center: 'items-center', right: 'items-end' }[
          alignment ?? 'center'
        ] ?? 'items-center';

      const avatarEl =
        showAvatar !== 'no' &&
        (avatar ? (
          <img
            src={avatar}
            alt={author ?? ''}
            className="h-14 w-14 rounded-full object-cover shadow-md ring-2"
            style={{ '--tw-ring-color': `${primary}40` } as CSSProperties}
          />
        ) : author ? (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-extrabold text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, #4f46e5 100%)` }}>
            {author
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0]?.toUpperCase() ?? '')
              .join('')}
          </div>
        ) : null);

      const attribution = [author, role, company].some((x) => Boolean(x?.trim())) && (
        <div className={`flex ${itemsAlign} gap-3`}>
          {avatarEl}
          <div className={alignClass}>
            {author ? (
              <p className="leading-tight font-extrabold" style={{ color: textColor }}>
                {author}
              </p>
            ) : null}
            {[role, company].some((x) => Boolean(x?.trim())) ? (
              <p className="text-sm text-gray-500">{[role, company].filter(Boolean).join(' · ')}</p>
            ) : null}
          </div>
        </div>
      );

      if (style === 'banner') {
        return (
          <div
            className="relative overflow-hidden px-6 py-20 sm:px-10"
            style={{
              ...styleProps,
              background: `linear-gradient(135deg, ${primary} 0%, #4f46e5 100%)`,
            }}>
            <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="relative mx-auto max-w-4xl text-center text-white">
              <div className="mb-4 font-serif text-9xl leading-none opacity-20">&ldquo;</div>
              <p
                className={`${quoteSize ?? 'text-xl md:text-2xl'} -mt-12 mb-10 leading-relaxed font-light italic`}>
                {quote}
              </p>
              <div className="flex items-center justify-center gap-4">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={author ?? ''}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-white/40"
                  />
                ) : null}
                <div className="text-left">
                  {author ? <p className="text-lg font-extrabold">{author}</p> : null}
                  {[role, company].some((x) => Boolean(x?.trim())) ? (
                    <p className="text-sm opacity-75">
                      {[role, company].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (style === 'minimal') {
        return (
          <div className="px-6 py-16 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className={`mx-auto flex max-w-3xl flex-col ${itemsAlign} gap-6`}>
              <div className={`border-l-4 pl-6 ${alignClass}`} style={{ borderColor: primary }}>
                <p
                  className={`${quoteSize ?? 'text-xl md:text-2xl'} leading-relaxed font-light italic`}
                  style={{ color: textColor }}>
                  &ldquo;{quote}&rdquo;
                </p>
              </div>
              {attribution}
            </div>
          </div>
        );
      }

      if (style === 'card') {
        return (
          <div className="px-6 py-16 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-3xl">
              <div
                className="rounded-3xl bg-white p-8 shadow-xl sm:p-12"
                style={{ borderTop: `4px solid ${primary}` }}>
                <div className={`flex flex-col ${itemsAlign} gap-6 ${alignClass}`}>
                  <div
                    className="font-serif text-7xl leading-none"
                    style={{ color: `${primary}25` }}>
                    &ldquo;
                  </div>
                  <p
                    className={`${quoteSize ?? 'text-xl md:text-2xl'} -mt-4 leading-relaxed font-light italic`}
                    style={{ color: textColor }}>
                    {quote}
                  </p>
                  {attribution}
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (style === 'centered') {
        return (
          <div className="px-6 py-24 sm:px-10" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-4xl text-center">
              <div
                className="mb-0 font-serif text-9xl leading-none"
                style={{ color: `${primary}15` }}>
                &ldquo;
              </div>
              <p
                className={`${quoteSize ?? 'text-2xl md:text-3xl'} -mt-8 mb-12 leading-relaxed font-light italic`}
                style={{ color: textColor }}>
                {quote}
              </p>
              <div className="flex items-center justify-center gap-4">
                {showAvatar !== 'no' && avatar ? (
                  <img
                    src={avatar}
                    alt={author ?? ''}
                    className="h-16 w-16 rounded-full object-cover shadow-md"
                  />
                ) : null}
                <div className="text-left">
                  {author ? (
                    <p className="text-lg font-extrabold" style={{ color: textColor }}>
                      {author}
                    </p>
                  ) : null}
                  {[role, company].some((x) => Boolean(x?.trim())) ? (
                    <p className="text-sm text-gray-500">
                      {[role, company].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Classic (default)
      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className={`mx-auto flex max-w-3xl flex-col ${itemsAlign} gap-6 ${alignClass}`}>
            <div className="font-serif text-8xl leading-none" style={{ color: primary }}>
              &ldquo;
            </div>
            <p
              className={`${quoteSize ?? 'text-xl md:text-2xl'} -mt-4 leading-relaxed font-light italic`}
              style={{ color: textColor }}>
              {quote}
            </p>
            <div className="h-0.5 w-12" style={{ backgroundColor: primary }} />
            {attribution}
          </div>
        </div>
      );
    },
  };
};

export default QuoteSection;
