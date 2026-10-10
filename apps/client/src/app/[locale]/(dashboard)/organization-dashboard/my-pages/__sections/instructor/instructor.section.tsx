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
import type { InstructorSectionProps, Instructor } from './types';
import { useTranslations } from 'next-intl';

const InstructorSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      backgroundColor: colorField(),
      titleColor: colorField(),
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Featured + Grid', value: 'featured' },
      ]),
      columns: selectField([
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ]),
      cardStyle: selectField([
        { label: 'Modern', value: 'modern' },
        { label: 'Classic', value: 'classic' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Creative', value: 'creative' },
      ]),
      showSocial: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showStats: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showBio: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      instructors: arrayField({
        name: textField(true),
        title: textField(true),
        image: imageField,
        bio: textareaField(true),
        courses: textField(true),
        students: textField(true),
        rating: textField(true),
        expertise: textField(true),
        twitter: linkField(),
        linkedin: linkField(),
        featured: radioField([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Meet Our Expert Instructors',
      subtitle: 'Learn from industry professionals with years of real-world experience',
      backgroundColor: '#ffffff',
      titleColor: '#111827',
      layout: 'grid',
      columns: '3',
      cardStyle: 'modern',
      showSocial: 'yes',
      showStats: 'yes',
      showBio: 'yes',
      instructors: [
        {
          name: 'Dr. Sarah Johnson',
          title: 'Data Science Expert',
          image: '',
          bio: 'Former Google ML engineer with 10+ years of experience in AI and machine learning. Published author and keynote speaker.',
          courses: '12',
          students: '45,000+',
          rating: '4.9',
          expertise: 'Machine Learning, Python, Data Analysis',
          twitter: '#',
          linkedin: '#',
          featured: 'yes',
        },
        {
          name: 'Michael Chen',
          title: 'Full Stack Developer',
          image: '',
          bio: 'Senior developer at Microsoft with expertise in web technologies. Passionate about teaching clean code principles.',
          courses: '8',
          students: '32,000+',
          rating: '4.8',
          expertise: 'React, Node.js, MongoDB',
          twitter: '#',
          linkedin: '#',
          featured: 'no',
        },
        {
          name: 'Emily Rodriguez',
          title: 'UX/UI Design Lead',
          image: '',
          bio: 'Award-winning designer with experience at top design agencies. Specializes in user-centered design methodologies.',
          courses: '6',
          students: '28,000+',
          rating: '4.9',
          expertise: 'Figma, User Research, Prototyping',
          twitter: '#',
          linkedin: '#',
          featured: 'no',
        },
      ],
    },
    render: function InstructorSectionRender({
      title,
      subtitle,
      backgroundColor,
      titleColor,
      layout,
      columns,
      cardStyle,
      showSocial,
      showStats,
      showBio,
      instructors,
      ...props
    }: InstructorSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);
      const cardStyles = {
        modern: 'bg-white rounded-2xl shadow-lg hover:shadow-2xl',
        classic: 'bg-white rounded-lg border-2 border-gray-200',
        minimal: 'bg-white rounded-xl border-l-4 border-purple-600',
        creative: 'bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl',
      };

      const instructorsArray: Instructor[] = Array.isArray(instructors) ? instructors : [];
      const featuredInstructor = instructorsArray.find((i: Instructor) => i.featured === 'yes');
      const regularInstructors = instructorsArray.filter((i: Instructor) => i.featured !== 'yes');

      return (
        <div className="px-6 py-20" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl" style={{ color: titleColor }}>
                {title}
              </h2>
              <p className="mx-auto max-w-3xl text-xl text-gray-600">{subtitle}</p>
            </div>

            {layout === 'featured' && featuredInstructor ? (
              <div className="mb-16 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 p-12 text-white">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    <div
                      className="mx-auto h-64 w-64 rounded-2xl bg-white/20"
                      style={{
                        backgroundImage: featuredInstructor.image
                          ? `url(${featuredInstructor.image})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <div className="mb-4 inline-block rounded-full bg-yellow-400 px-4 py-1 text-sm font-bold text-gray-900">
                      {t('featuredInstructor')}
                    </div>
                    <h3 className="mb-2 text-4xl font-bold">{featuredInstructor.name}</h3>
                    <p className="mb-4 text-xl opacity-90">{featuredInstructor.title}</p>
                    {showBio === 'yes' && (
                      <p className="mb-6 text-lg opacity-90">{featuredInstructor.bio}</p>
                    )}
                    {showStats === 'yes' && (
                      <div className="mb-6 grid grid-cols-3 gap-6">
                        <div>
                          <div className="text-3xl font-bold">{featuredInstructor.courses}</div>
                          <div className="text-sm opacity-80">{t('courses')}</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold">{featuredInstructor.students}</div>
                          <div className="text-sm opacity-80">{t('students')}</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold">{featuredInstructor.rating} ⭐</div>
                          <div className="text-sm opacity-80">{t('rating')}</div>
                        </div>
                      </div>
                    )}
                    {featuredInstructor.expertise ? (
                      <div className="mb-6 flex flex-wrap gap-2">
                        {featuredInstructor.expertise
                          .split(',')
                          .map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                              {skill.trim()}
                            </span>
                          ))}
                      </div>
                    ) : null}
                    {showSocial === 'yes' && (
                      <div className="flex gap-4">
                        {featuredInstructor.twitter ? (
                          <a
                            href={featuredInstructor.twitter}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
                            🐦
                          </a>
                        ) : null}
                        {featuredInstructor.linkedin ? (
                          <a
                            href={featuredInstructor.linkedin}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
                            💼
                          </a>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className={`grid grid-cols-1 md:grid-cols-${columns ?? '3'} gap-8`}>
              {(layout === 'featured' ? regularInstructors : instructorsArray).map(
                (instructor: Instructor, idx: number) => (
                  <div
                    key={idx}
                    className={`${cardStyles[(cardStyle ?? 'modern') as keyof typeof cardStyles]} p-8 transition-all duration-300 hover:-translate-y-1`}>
                    <div
                      className="mx-auto mb-6 h-32 w-32 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500"
                      style={{
                        backgroundImage: instructor.image ? `url(${instructor.image})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <h3 className="mb-2 text-center text-2xl font-bold text-gray-900">
                      {instructor.name}
                    </h3>
                    <p className="mb-4 text-center font-semibold text-purple-600">
                      {instructor.title}
                    </p>

                    {showBio === 'yes' && instructor.bio ? (
                      <p className="mb-6 text-center text-gray-600">{instructor.bio}</p>
                    ) : null}

                    {showStats === 'yes' && (
                      <div className="mb-6 grid grid-cols-3 gap-4 border-y border-gray-200 py-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {instructor.courses}
                          </div>
                          <div className="text-xs text-gray-500">{t('courses')}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {instructor.students}
                          </div>
                          <div className="text-xs text-gray-500">{t('students')}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {instructor.rating}
                          </div>
                          <div className="text-xs text-gray-500">{t('rating')}</div>
                        </div>
                      </div>
                    )}

                    {instructor.expertise ? (
                      <div className="mb-6 flex flex-wrap justify-center gap-2">
                        {instructor.expertise
                          .split(',')
                          .slice(0, 3)
                          .map((skill: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                              {skill.trim()}
                            </span>
                          ))}
                      </div>
                    ) : null}

                    {showSocial === 'yes' && (
                      <div className="flex justify-center gap-3">
                        {instructor.twitter ? (
                          <a
                            href={instructor.twitter}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200">
                            🐦
                          </a>
                        ) : null}
                        {instructor.linkedin ? (
                          <a
                            href={instructor.linkedin}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200">
                            💼
                          </a>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    },
  };
};

export default InstructorSection;
