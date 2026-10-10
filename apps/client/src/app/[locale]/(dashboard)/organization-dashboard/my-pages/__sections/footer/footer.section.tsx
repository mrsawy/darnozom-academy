import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  linkField,
  colorField,
  radioField,
  selectField,
  arrayField,
  imageField,
} from '../utils';
import type { FooterSectionProps, FooterColumn, SocialLink, FooterBadge, LegalLink } from './types';
import { useTranslations } from 'next-intl';

/** Newline-separated string in Puck; saved data may use string[] or other shapes. */
function footerColumnLinkLines(links: unknown): string[] {
  if (typeof links === 'string') {
    return links.split('\n').filter(Boolean);
  }
  if (Array.isArray(links)) {
    return links
      .map((item) => {
        if (typeof item === 'string') return item;
        if (
          item &&
          typeof item === 'object' &&
          'text' in item &&
          typeof (item as { text: unknown }).text === 'string'
        ) {
          return (item as { text: string }).text;
        }
        return '';
      })
      .filter(Boolean);
  }
  return [];
}

const FooterSection = () => {
  return {
    fields: {
      ...styleFields,
      companyName: textField(true),
      logo: imageField,
      description: textareaField(true),
      copyright: textField(true),
      backgroundColor: colorField(),
      textColor: colorField(),
      layout: selectField([
        { label: '4 Columns', value: 'four' },
        { label: '3 Columns', value: 'three' },
        { label: 'Centered', value: 'centered' },
        { label: 'Minimal', value: 'minimal' },
      ]),
      showNewsletter: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      newsletterTitle: textField(true),
      newsletterPlaceholder: textField(true),
      showDivider: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      columns: arrayField({
        title: textField(true),
        links: textareaField(true),
      }),
      socialLinks: arrayField({
        platform: textField(true),
        url: linkField(),
        icon: textField(true),
      }),
      badges: arrayField({
        text: textField(true),
        icon: textField(true),
      }),
      legalLinks: arrayField({
        text: textField(true),
        url: linkField(),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      companyName: 'LMS Platform',
      logo: '🎓',
      description:
        'Empowering learners worldwide with quality education and professional development opportunities',
      copyright: '© 2025 LMS Platform. All rights reserved.',
      backgroundColor: '#111827',
      textColor: '#ffffff',
      layout: 'four',
      showNewsletter: 'yes',
      newsletterTitle: 'Subscribe to our newsletter',
      newsletterPlaceholder: 'Your email',
      showDivider: 'yes',
      columns: [
        { title: 'Product', links: 'All Courses\nPricing\nFor Business\nRequest Demo' },
        { title: 'Resources', links: 'Blog\nHelp Center\nCommunity\nWebinars' },
        { title: 'Company', links: 'About Us\nCareers\nPress Kit\nContact' },
      ],
      socialLinks: [
        { platform: 'Twitter', url: '#', icon: '🐦' },
        { platform: 'LinkedIn', url: '#', icon: '💼' },
        { platform: 'YouTube', url: '#', icon: '▶️' },
        { platform: 'Instagram', url: '#', icon: '📷' },
      ],
      badges: [
        { text: 'Trusted by 10,000+ students', icon: '⭐' },
        { text: '99.9% Uptime', icon: '🚀' },
      ],
      legalLinks: [
        { text: 'Privacy Policy', url: '#' },
        { text: 'Terms of Service', url: '#' },
        { text: 'Cookie Policy', url: '#' },
      ],
    },
    render: function FooterSectionRender({
      companyName,
      logo,
      description,
      copyright,
      backgroundColor,
      textColor,
      layout,
      showNewsletter,
      newsletterTitle,
      newsletterPlaceholder,
      showDivider,
      columns,
      socialLinks,
      badges,
      legalLinks,
      ...props
    }: FooterSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const columnsArray: FooterColumn[] = Array.isArray(columns) ? columns : [];
      const socialLinksArray: SocialLink[] = Array.isArray(socialLinks) ? socialLinks : [];
      const badgesArray: FooterBadge[] = Array.isArray(badges) ? badges : [];
      const legalLinksArray: LegalLink[] = Array.isArray(legalLinks) ? legalLinks : [];

      if (layout === 'minimal') {
        return (
          <footer className="px-6 py-12" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                <div className="flex items-center gap-3" style={{ color: textColor }}>
                  {logo ? <span className="text-4xl">{logo}</span> : null}
                  <span className="text-2xl font-bold">{companyName}</span>
                </div>

                <div className="flex flex-wrap justify-center gap-6">
                  {columnsArray.flatMap((col: FooterColumn) =>
                    footerColumnLinkLines(col.links).map((link: string, idx: number) => (
                      <a
                        key={`${col.title ?? ''}-${idx}`}
                        href={link || '#'}
                        className="transition-colors hover:text-purple-400"
                        style={{ color: textColor, opacity: 0.8 }}>
                        {link}
                      </a>
                    ))
                  )}
                </div>

                <div className="flex gap-4">
                  {socialLinksArray.map((social: SocialLink, idx: number) => (
                    <a
                      key={idx}
                      href={social.url || '#'}
                      className="text-2xl transition-transform hover:scale-110"
                      style={{ color: textColor, opacity: 0.8 }}>
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>

              {showDivider === 'yes' && (
                <div className="my-8 border-t" style={{ borderColor: textColor, opacity: 0.2 }} />
              )}

              <div
                className="flex flex-col items-center justify-between gap-4 text-sm md:flex-row"
                style={{ color: textColor, opacity: 0.6 }}>
                <div>{copyright}</div>
                <div className="flex gap-6">
                  {legalLinksArray.map((link: LegalLink, idx: number) => (
                    <a
                      key={idx}
                      href={link.url || '#'}
                      className="transition-opacity hover:opacity-100">
                      {link.text}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        );
      }

      if (layout === 'centered') {
        return (
          <footer className="px-6 py-16" style={{ ...styleProps, backgroundColor }}>
            <div className="mx-auto max-w-4xl text-center" style={{ color: textColor }}>
              <div className="mb-8">
                {logo ? <div className="mb-4 text-6xl">{logo}</div> : null}
                <h3 className="mb-4 text-3xl font-bold">{companyName}</h3>
                <p className="mx-auto max-w-2xl text-lg opacity-80">{description}</p>
              </div>

              {showNewsletter === 'yes' && (
                <div className="mb-12">
                  <h4 className="mb-4 text-xl font-semibold">{newsletterTitle}</h4>
                  <div className="mx-auto flex max-w-md gap-3">
                    <input
                      type="email"
                      placeholder={newsletterPlaceholder}
                      className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      className="rounded-lg bg-purple-600 px-6 py-3 font-semibold transition-colors hover:bg-purple-700">
                      {t('subscribe')}
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-8 flex justify-center gap-6">
                {socialLinksArray.map((social: SocialLink, idx: number) => (
                  <a
                    key={idx}
                    href={social.url || '#'}
                    className="text-3xl opacity-80 transition-transform hover:scale-110 hover:opacity-100">
                    {social.icon}
                  </a>
                ))}
              </div>

              <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
                {columnsArray.map((column: FooterColumn, colIdx: number) => (
                  <div key={colIdx}>
                    <h4 className="mb-3 font-semibold">{column.title}</h4>
                    <ul className="space-y-2 text-sm opacity-80">
                      {footerColumnLinkLines(column.links).map((link: string, lIdx: number) => (
                        <li key={lIdx}>
                          <a href={link || '#'} className="transition-colors hover:text-purple-400">
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {showDivider === 'yes' && <div className="my-8 border-t border-white/20" />}

              <div className="text-sm opacity-60">{copyright}</div>
            </div>
          </footer>
        );
      }

      // Four or Three column layout (default)
      return (
        <footer className="px-6 py-12" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div
              className={`grid grid-cols-1 md:grid-cols-${layout === 'three' ? '3' : '4'} mb-12 gap-8`}>
              <div
                className={layout === 'four' ? 'md:col-span-2' : ''}
                style={{ color: textColor }}>
                <div className="mb-4 flex items-center gap-3">
                  {logo ? <span className="text-5xl">{logo}</span> : null}
                  <h3 className="text-3xl font-bold">{companyName}</h3>
                </div>
                <p className="mb-6 max-w-md opacity-80">{description}</p>

                {showNewsletter === 'yes' && (
                  <div className="mb-6">
                    <h4 className="mb-3 font-semibold">{newsletterTitle}</h4>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder={newsletterPlaceholder}
                        className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        className="rounded-lg bg-purple-600 px-4 py-2 font-semibold transition-colors hover:bg-purple-700">
                        →
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-6 flex gap-4">
                  {socialLinksArray.map((social: SocialLink, idx: number) => (
                    <a
                      key={idx}
                      href={social.url || '#'}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl transition-colors hover:bg-white/20">
                      {social.icon}
                    </a>
                  ))}
                </div>

                {badgesArray.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {badgesArray.map((badge: FooterBadge, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                        <span>{badge.icon}</span>
                        <span>{badge.text}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {columnsArray.map((column: FooterColumn, idx: number) => (
                <div key={idx} style={{ color: textColor }}>
                  <h4 className="mb-4 text-lg font-bold">{column.title}</h4>
                  <ul className="space-y-3">
                    {footerColumnLinkLines(column.links).map((link: string, lIdx: number) => (
                      <li key={lIdx}>
                        <a
                          href={link || '#'}
                          className="opacity-80 transition-colors hover:text-purple-400 hover:opacity-100">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {showDivider === 'yes' && (
              <div className="mb-8 border-t" style={{ borderColor: textColor, opacity: 0.2 }} />
            )}

            <div
              className="flex flex-col items-center justify-between gap-4 md:flex-row"
              style={{ color: textColor }}>
              <div className="text-sm opacity-60">{copyright}</div>
              <div className="flex flex-wrap gap-6 text-sm opacity-60">
                {legalLinksArray.map((link: LegalLink, idx: number) => (
                  <a
                    key={idx}
                    href={link.url || '#'}
                    className="transition-colors hover:text-purple-400 hover:opacity-100">
                    {link.text}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      );
    },
  };
};

export default FooterSection;
