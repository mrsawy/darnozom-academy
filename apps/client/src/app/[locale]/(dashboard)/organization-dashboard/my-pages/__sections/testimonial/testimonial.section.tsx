/* eslint-disable @next/next/no-img-element */
import {
  styleFields,
  defaultStyleProps,
  getStyleProps,
  textField,
  textareaField,
  colorField,
  colorFields,
  numberField,
  radioField,
  selectField,
  arrayField,
  imageField,
} from '../utils';
import type { TestimonialSectionProps, Testimonial } from './types';

const colsMap: Record<string, string> = {
  '1': '',
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-2 lg:grid-cols-3',
};

function initials(name: unknown) {
  const s = typeof name === 'string' ? name : typeof name === 'number' ? String(name) : '';
  return s
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function StarRating({ count, color }: { count: number; color: string }) {
  return (
    <div className="mb-4 flex gap-1">
      {Array.from({ length: Math.min(5, Math.max(0, count)) }).map((_, i) => (
        <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20" style={{ color }}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const TestimonialSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      ...colorFields,
      accentColor: colorField(),
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'Featured + Grid', value: 'featured' },
        { label: 'Masonry', value: 'masonry' },
      ]),
      columns: selectField([
        { label: '1 Column', value: '1' },
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
      ]),
      cardStyle: selectField([
        { label: 'Modern Shadow', value: 'modern' },
        { label: 'Classic Border', value: 'classic' },
        { label: 'Minimal Accent', value: 'minimal' },
        { label: 'Quote Style', value: 'quote' },
        { label: 'Gradient', value: 'gradient' },
      ]),
      showRatings: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showCompany: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showDate: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      avatarStyle: selectField([
        { label: 'Circle', value: 'rounded-full' },
        { label: 'Rounded Square', value: 'rounded-xl' },
      ]),
      avatarSize: selectField([
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ]),
      testimonials: arrayField({
        name: textField(true),
        role: textField(true),
        company: textField(true),
        avatar: imageField,
        content: textareaField(true),
        rating: numberField(1, 5),
        date: textField(true),
        featured: radioField([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'What Our Students Say',
      subtitle: "Don't just take our word for it — hear from our community of learners",
      backgroundColor: '#f5f3ff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      layout: 'featured',
      columns: '3',
      cardStyle: 'modern',
      showRatings: 'yes',
      showCompany: 'yes',
      showDate: 'yes',
      avatarStyle: 'rounded-full',
      avatarSize: 'md',
      testimonials: [
        {
          name: 'Sarah Johnson',
          role: 'Marketing Manager',
          company: 'Tech Corp',
          avatar: '',
          content:
            "This platform transformed my career. The courses are practical, engaging, and taught by industry experts. I've learned more in 3 months than I did in years of self-study!",
          rating: 5,
          date: '2 weeks ago',
          featured: 'yes',
        },
        {
          name: 'Mike Chen',
          role: 'Software Developer',
          company: 'StartupXYZ',
          avatar: '',
          content:
            'Best investment in my professional development. The community support and mentorship made all the difference. Highly recommended for anyone serious about growth!',
          rating: 5,
          date: '1 month ago',
          featured: 'no',
        },
        {
          name: 'Emily Rodriguez',
          role: 'Data Analyst',
          company: 'Analytics Inc',
          avatar: '',
          content:
            'The quality of instruction is outstanding. I was able to transition into a new career path thanks to the comprehensive curriculum and hands-on projects.',
          rating: 5,
          date: '3 weeks ago',
          featured: 'no',
        },
        {
          name: 'James Park',
          role: 'UX Designer',
          company: 'Creative Studio',
          avatar: '',
          content:
            'I was skeptical at first but the results speak for themselves. Within 6 weeks I landed my dream job. The instructors truly care about your success.',
          rating: 5,
          date: '2 months ago',
          featured: 'no',
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
      cardStyle,
      showRatings,
      showCompany,
      showDate,
      avatarStyle,
      avatarSize,
      testimonials,
      ...props
    }: TestimonialSectionProps) => {
      const styleProps = getStyleProps(props);
      const testimonialsArray: Testimonial[] = Array.isArray(testimonials) ? testimonials : [];

      const avatarDim =
        { sm: 'h-10 w-10 text-sm', md: 'h-14 w-14 text-base', lg: 'h-20 w-20 text-lg' }[
          avatarSize ?? 'md'
        ] ?? 'h-14 w-14 text-base';

      const cardClass =
        {
          modern:
            'bg-white rounded-2xl p-7 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1',
          classic:
            'bg-white rounded-xl border-2 border-gray-100 p-7 hover:border-purple-200 transition-all duration-300',
          minimal: 'bg-white rounded-xl border-l-4 p-7 hover:shadow-md transition-all duration-300',
          quote: 'rounded-2xl p-7 transition-all duration-300',
          gradient: 'rounded-2xl p-7 hover:shadow-lg transition-all duration-300',
        }[cardStyle ?? 'modern'] ?? 'bg-white rounded-2xl p-7 shadow-md';

      function renderAvatar(t: Testimonial) {
        if (t.avatar) {
          return (
            <img
              src={t.avatar}
              alt={t.name ?? ''}
              className={`${avatarDim} ${avatarStyle ?? 'rounded-full'} shrink-0 object-cover`}
              style={{ boxShadow: `0 0 0 2px ${accentColor ?? '#7c3aed'}` }}
            />
          );
        }
        return (
          <div
            className={`${avatarDim} ${avatarStyle ?? 'rounded-full'} flex shrink-0 items-center justify-center font-bold text-white`}
            style={{
              background: `linear-gradient(135deg, ${accentColor ?? '#7c3aed'} 0%, #4f46e5 100%)`,
            }}>
            {initials(t.name ?? '?')}
          </div>
        );
      }

      function renderCard(t: Testimonial, idx: number) {
        const gradientStyle =
          cardStyle === 'gradient'
            ? {
                background: `linear-gradient(135deg, ${accentColor ?? '#7c3aed'}15 0%, #4f46e510 100%)`,
              }
            : {};
        const quoteStyle =
          cardStyle === 'quote'
            ? {
                background: `${accentColor ?? '#7c3aed'}08`,
                border: `1px solid ${accentColor ?? '#7c3aed'}20`,
              }
            : {};
        const minimalStyle =
          cardStyle === 'minimal' ? { borderLeftColor: accentColor ?? '#7c3aed' } : {};

        return (
          <div
            key={idx}
            className={cardClass}
            style={{ ...gradientStyle, ...quoteStyle, ...minimalStyle }}>
            {cardStyle === 'quote' && (
              <div
                className="mb-3 font-serif text-5xl leading-none opacity-30"
                style={{ color: accentColor ?? '#7c3aed' }}>
                &ldquo;
              </div>
            )}
            {showRatings === 'yes' && t.rating && Number(t.rating) > 0 ? (
              <StarRating count={Number(t.rating)} color={accentColor ?? '#7c3aed'} />
            ) : null}
            <p className="mb-6 leading-relaxed text-gray-700">&ldquo;{t.content}&rdquo;</p>
            <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                {renderAvatar(t)}
                <div className="min-w-0">
                  <div className="truncate font-bold text-gray-900">{t.name}</div>
                  <div
                    className="truncate text-sm font-medium"
                    style={{ color: accentColor ?? '#7c3aed' }}>
                    {t.role}
                  </div>
                  {showCompany === 'yes' && t.company ? (
                    <div className="truncate text-xs text-gray-400">{t.company}</div>
                  ) : null}
                </div>
              </div>
              {showDate === 'yes' && t.date ? (
                <div className="shrink-0 text-xs text-gray-400">{t.date}</div>
              ) : null}
            </div>
          </div>
        );
      }

      const featured = testimonialsArray.find((t) => t.featured === 'yes');
      const rest = testimonialsArray.filter((t) => t.featured !== 'yes');
      const gridClass = `grid grid-cols-1 gap-6 ${colsMap[columns ?? '3'] ?? 'md:grid-cols-2 lg:grid-cols-3'}`;

      return (
        <div className="px-6 py-20 sm:px-10" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
                style={{ color: textColor }}>
                {title}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-500">{subtitle}</p>
            </div>

            {layout === 'featured' && featured ? (
              <div
                className="mb-8 overflow-hidden rounded-3xl shadow-xl ring-1 ring-gray-100"
                style={{
                  background: `linear-gradient(135deg, ${accentColor ?? '#7c3aed'} 0%, #4f46e5 100%)`,
                }}>
                <div className="bg-white/95 p-8 backdrop-blur-sm md:p-12">
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
                    <div className="flex shrink-0 justify-center lg:justify-start">
                      {featured.avatar ? (
                        <img
                          src={featured.avatar}
                          alt={featured.name ?? ''}
                          className="h-28 w-28 rounded-2xl object-cover shadow-lg"
                        />
                      ) : (
                        <div
                          className="flex h-28 w-28 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${accentColor ?? '#7c3aed'} 0%, #4f46e5 100%)`,
                          }}>
                          {initials(featured.name ?? '?')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      {showRatings === 'yes' && featured.rating && Number(featured.rating) > 0 ? (
                        <StarRating
                          count={Number(featured.rating)}
                          color={accentColor ?? '#7c3aed'}
                        />
                      ) : null}
                      <p className="mb-6 text-xl leading-relaxed text-gray-700 md:text-2xl">
                        &ldquo;{featured.content}&rdquo;
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-xl font-bold text-gray-900">{featured.name}</div>
                          <div
                            className="font-semibold"
                            style={{ color: accentColor ?? '#7c3aed' }}>
                            {featured.role}
                          </div>
                          {showCompany === 'yes' && featured.company ? (
                            <div className="text-gray-500">{featured.company}</div>
                          ) : null}
                        </div>
                        {showDate === 'yes' && featured.date ? (
                          <div className="rounded-full bg-gray-100 px-4 py-1 text-sm text-gray-500">
                            {featured.date}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={gridClass}>
              {(layout === 'featured' ? rest : testimonialsArray).map(renderCard)}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default TestimonialSection;
