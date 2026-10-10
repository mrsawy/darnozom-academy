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
  radioField,
  selectField,
  linkField,
  arrayField,
  imageField,
} from '../utils';
import type { TeamSectionProps, TeamMember } from './types';
import { useTranslations } from 'next-intl';

const colsMap: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
};

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

const TeamSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      ...colorFields,
      accentColor: colorField(),
      columns: selectField([
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ]),
      cardStyle: selectField([
        { label: 'Modern (hover lift)', value: 'modern' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Elevated Shadow', value: 'elevated' },
        { label: 'Bordered', value: 'bordered' },
        { label: 'Gradient Header', value: 'gradient' },
      ]),
      imageShape: selectField([
        { label: 'Circle', value: 'rounded-full' },
        { label: 'Rounded Square', value: 'rounded-2xl' },
        { label: 'Square', value: 'rounded-none' },
      ]),
      imageSize: selectField([
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ]),
      showSocial: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showBio: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      members: arrayField({
        name: textField(true),
        role: textField(true),
        bio: textareaField(true),
        avatar: imageField,
        linkedin: linkField(),
        twitter: linkField(),
        specialties: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Meet Our Team',
      subtitle: 'Passionate educators and industry experts dedicated to your success',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#7c3aed',
      columns: '3',
      cardStyle: 'modern',
      imageShape: 'rounded-full',
      imageSize: 'md',
      showSocial: 'yes',
      showBio: 'yes',
      members: [
        {
          name: 'Dr. Sarah Williams',
          role: 'Head of Curriculum',
          bio: 'Former Google engineer with 15 years of teaching experience. Passionate about making complex topics accessible.',
          avatar: '',
          linkedin: '#',
          twitter: '#',
          specialties: 'AI, Machine Learning',
        },
        {
          name: 'James Martinez',
          role: 'Lead Instructor',
          bio: 'Award-winning educator and author of "Modern Web Development". Loves helping students land their dream jobs.',
          avatar: '',
          linkedin: '#',
          twitter: '#',
          specialties: 'React, Node.js',
        },
        {
          name: 'Emily Chen',
          role: 'UX & Design Lead',
          bio: 'Previously at Apple and Airbnb. Brings real-world design thinking into every course she creates.',
          avatar: '',
          linkedin: '#',
          twitter: '#',
          specialties: 'UX/UI, Figma, Design Systems',
        },
        {
          name: 'Marcus Johnson',
          role: 'Data Science Expert',
          bio: 'PhD in Statistics from MIT. Has trained over 5,000 data professionals across 40+ countries.',
          avatar: '',
          linkedin: '#',
          twitter: '#',
          specialties: 'Python, Data Analysis, ML',
        },
      ],
    },
    render: function TeamSectionRender({
      title,
      subtitle,
      backgroundColor,
      textColor,
      accentColor,
      columns,
      cardStyle,
      imageShape,
      imageSize,
      showSocial,
      showBio,
      members,
      ...props
    }: TeamSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const membersArray: TeamMember[] = Array.isArray(members) ? members : [];
      const primaryColor = accentColor ?? '#7c3aed';

      const imgDim =
        { sm: 'h-20 w-20', md: 'h-28 w-28', lg: 'h-36 w-36' }[imageSize ?? 'md'] ?? 'h-28 w-28';

      const cardWrap =
        {
          modern:
            'group bg-white rounded-2xl p-6 text-center shadow-md hover:-translate-y-2 hover:shadow-xl transition-all duration-300',
          minimal: 'group text-center p-6',
          elevated: 'group bg-white rounded-2xl p-6 text-center shadow-xl',
          bordered:
            'group bg-white rounded-2xl border-2 border-gray-100 p-6 text-center hover:border-purple-200 transition-all duration-300',
          gradient:
            'group overflow-hidden rounded-2xl text-center shadow-md hover:shadow-xl transition-all duration-300',
        }[cardStyle ?? 'modern'] ?? 'group bg-white rounded-2xl p-6 text-center shadow-md';

      const gridClass = `grid grid-cols-1 gap-8 ${colsMap[columns ?? '3'] ?? 'sm:grid-cols-2 lg:grid-cols-3'}`;

      function renderAvatar(m: TeamMember) {
        if (m.avatar) {
          return (
            <img
              src={m.avatar}
              alt={m.name ?? ''}
              className={`${imgDim} ${imageShape ?? 'rounded-full'} mx-auto object-cover ring-4 transition-all group-hover:ring-8`}
              style={{ '--tw-ring-color': `${primaryColor}40` } as CSSProperties}
            />
          );
        }
        return (
          <div
            className={`${imgDim} ${imageShape ?? 'rounded-full'} mx-auto flex items-center justify-center text-3xl font-extrabold text-white ring-4 transition-all group-hover:ring-8`}
            style={
              {
                background: `linear-gradient(135deg, ${primaryColor} 0%, #4f46e5 100%)`,
                '--tw-ring-color': `${primaryColor}40`,
              } as CSSProperties
            }>
            {initials(m.name ?? '?')}
          </div>
        );
      }

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

            <div className={gridClass}>
              {membersArray.map((member, idx) => (
                <div key={idx} className={cardWrap}>
                  {/* Gradient header band for gradient style */}
                  {cardStyle === 'gradient' && (
                    <div
                      className="h-24 w-full"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, #4f46e5 100%)`,
                      }}
                    />
                  )}
                  <div className={cardStyle === 'gradient' ? '-mt-14 px-6 pb-6' : ''}>
                    <div className={`${cardStyle === 'gradient' ? 'mb-4' : 'mb-5'}`}>
                      {renderAvatar(member)}
                    </div>
                    <h3 className="mb-1 text-xl font-extrabold" style={{ color: textColor }}>
                      {member.name}
                    </h3>
                    <p
                      className="mb-2 text-sm font-bold tracking-wide uppercase"
                      style={{ color: primaryColor }}>
                      {member.role}
                    </p>
                    {member.specialties ? (
                      <p className="mb-3 text-xs text-gray-400">{member.specialties}</p>
                    ) : null}
                    {showBio === 'yes' && member.bio ? (
                      <p className="mb-5 text-sm leading-relaxed text-gray-500">{member.bio}</p>
                    ) : null}
                    {showSocial === 'yes' && (member.linkedin || member.twitter) ? (
                      <div className="flex justify-center gap-3">
                        {member.linkedin ? (
                          <a
                            href={member.linkedin}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm text-white transition-all hover:scale-110"
                            style={{ backgroundColor: '#0A66C2' }}
                            aria-label={t('linkedin')}>
                            {t('linkedinGlyph')}
                          </a>
                        ) : null}
                        {member.twitter ? (
                          <a
                            href={member.twitter}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm text-white transition-all hover:scale-110"
                            style={{ backgroundColor: '#1DA1F2' }}
                            aria-label={t('twitter')}>
                            {t('twitterGlyph')}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
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

export default TeamSection;
