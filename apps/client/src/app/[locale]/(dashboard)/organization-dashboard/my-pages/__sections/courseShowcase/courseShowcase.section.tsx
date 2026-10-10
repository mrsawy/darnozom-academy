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
import type { CourseShowcaseSectionProps, CourseShowcaseCourse } from './types';
import { useTranslations } from 'next-intl';

const CourseShowcase = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      backgroundColor: colorField(),
      titleColor: colorField(),
      viewAllText: textField(true),
      showFilters: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'List', value: 'list' },
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
        { label: 'Bold', value: 'bold' },
      ]),
      showBadges: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showDuration: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showLevel: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      courses: arrayField({
        image: imageField,
        title: textField(true),
        instructor: textField(true),
        price: textField(true),
        oldPrice: textField(true),
        rating: textField(true),
        students: textField(true),
        duration: textField(true),
        level: textField(true),
        badge: textField(true),
        category: textField(true),
        link: linkField(),
        learnMoreText: textField(true),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Popular Courses',
      subtitle: 'Explore our most popular courses and start learning today',
      viewAllText: 'View All Courses',
      backgroundColor: '#ffffff',
      titleColor: '#111827',
      showFilters: 'yes',
      layout: 'grid',
      columns: '3',
      cardStyle: 'modern',
      showBadges: 'yes',
      showDuration: 'yes',
      showLevel: 'yes',
      courses: [
        {
          image: '',
          title: 'Web Development Bootcamp',
          instructor: 'John Doe',
          price: '$49',
          oldPrice: '$99',
          rating: '4.8',
          students: '1,234',
          duration: '40 hours',
          level: 'Beginner',
          badge: 'Bestseller',
          category: 'Development',
          link: '#',
          learnMoreText: 'Learn More',
        },
        {
          image: '',
          title: 'Data Science Fundamentals',
          instructor: 'Jane Smith',
          price: '$59',
          oldPrice: '$129',
          rating: '4.9',
          students: '2,100',
          duration: '35 hours',
          level: 'Intermediate',
          badge: 'New',
          category: 'Data Science',
          link: '#',
          learnMoreText: 'Learn More',
        },
        {
          image: '',
          title: 'UI/UX Design Masterclass',
          instructor: 'Mike Johnson',
          price: '$79',
          oldPrice: '',
          rating: '4.7',
          students: '890',
          duration: '28 hours',
          level: 'Advanced',
          badge: '',
          category: 'Design',
          link: '#',
          learnMoreText: 'Learn More',
        },
      ],
    },
    render: function CourseShowcaseRender({
      title,
      subtitle,
      viewAllText,
      backgroundColor,
      titleColor,
      showFilters,
      layout,
      columns,
      cardStyle,
      showBadges,
      showDuration,
      showLevel,
      courses,
      ...props
    }: CourseShowcaseSectionProps) {
      const t = useTranslations('MyPagesSections');

      const styleProps = getStyleProps(props);

      const categories: string[] = [
        ...new Set(
          courses?.map((c: CourseShowcaseCourse) => c.category).filter(Boolean) as string[]
        ),
      ];

      const cardStyles: Record<NonNullable<CourseShowcaseSectionProps['cardStyle']>, string> = {
        modern: 'rounded-2xl overflow-hidden border border-gray-100',
        classic: 'rounded-lg overflow-hidden shadow-md',
        minimal: 'rounded-xl overflow-hidden border-2 border-gray-200',
        bold: 'rounded-2xl overflow-hidden shadow-xl border-4 border-purple-500',
      };

      const currentCardStyle = cardStyle ?? 'modern';

      return (
        <div className="px-6 py-20" style={{ ...styleProps, backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl" style={{ color: titleColor }}>
                {title}
              </h2>
              <p className="mx-auto max-w-3xl text-xl text-gray-600">{subtitle}</p>
            </div>

            {showFilters === 'yes' && categories.length > 0 && (
              <div className="mb-12 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="rounded-full bg-purple-600 px-6 py-2 font-semibold text-white">
                  {t('all')}
                </button>
                {categories.map((cat: string) => (
                  <button
                    type="button"
                    key={cat}
                    className="rounded-full bg-gray-100 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-200">
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-8`}>
              {courses?.map((course: CourseShowcaseCourse, idx: number) => (
                <a
                  key={idx}
                  href={course.link ?? '#'}
                  className={`${cardStyles[currentCardStyle]} group transform cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
                  <div
                    className="relative h-48 overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600"
                    style={{
                      backgroundImage: course.image ? `url(${course.image})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}>
                    {showBadges === 'yes' && course.badge ? (
                      <div className="absolute top-4 left-4 rounded-full bg-yellow-400 px-3 py-1 text-sm font-bold text-gray-900">
                        {course.badge}
                      </div>
                    ) : null}
                    {showDuration === 'yes' && course.duration ? (
                      <div className="absolute right-4 bottom-4 rounded-lg bg-black/70 px-3 py-1 text-sm font-semibold text-white">
                        {course.duration}
                      </div>
                    ) : null}
                  </div>
                  <div className="p-6">
                    <div className="mb-2 flex items-center justify-between">
                      {course.category ? (
                        <span className="text-sm font-semibold tracking-wide text-purple-600 uppercase">
                          {course.category}
                        </span>
                      ) : null}
                      {showLevel === 'yes' && course.level ? (
                        <span className="text-sm text-gray-500">{course.level}</span>
                      ) : null}
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900 transition-colors group-hover:text-purple-600">
                      {course.title}
                    </h3>
                    <p className="mb-4 text-sm text-gray-600">
                      {t('byInstructor', { instructor: course.instructor ?? '' })}
                    </p>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-bold text-gray-900">{course.rating}</span>
                        <span className="text-sm text-gray-500">({course.students})</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-purple-600">{course.price}</span>
                        {course.oldPrice ? (
                          <span className="text-lg text-gray-400 line-through">
                            {course.oldPrice}
                          </span>
                        ) : null}
                      </div>
                      <span className="flex items-center gap-1 font-semibold text-purple-600 transition-transform group-hover:translate-x-1">
                        {course.learnMoreText ?? t('learnMore')} <span>→</span>
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-12 text-center">
              <button
                type="button"
                className="rounded-lg bg-purple-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-purple-700">
                {viewAllText}
              </button>
            </div>
          </div>
        </div>
      );
    },
  };
};

export default CourseShowcase;
