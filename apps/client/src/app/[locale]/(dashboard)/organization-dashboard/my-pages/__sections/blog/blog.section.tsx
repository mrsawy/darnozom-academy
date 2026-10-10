import {
  styleFields,
  defaultStyleProps,
  textField,
  textareaField,
  linkField,
  colorField,
  radioField,
  selectField,
  arrayField,
  imageField,
} from '../utils';
import type { BlogSectionProps, BlogArticle } from './types';

const BlogSection = () => {
  return {
    fields: {
      ...styleFields,
      title: textField(true),
      subtitle: textareaField(true),
      backgroundColor: colorField(),
      titleColor: colorField(),
      viewAllText: textField(true),
      viewAllLink: linkField(),
      layout: selectField([
        { label: 'Grid', value: 'grid' },
        { label: 'Featured + Grid', value: 'featured' },
        { label: 'Magazine', value: 'magazine' },
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
        { label: 'Overlay', value: 'overlay' },
      ]),
      showAuthor: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showDate: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showReadTime: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      showCategory: radioField([
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]),
      articles: arrayField({
        title: textField(true),
        excerpt: textareaField(true),
        image: imageField,
        author: textField(true),
        authorAvatar: imageField,
        date: textField(true),
        readTime: textField(true),
        category: textField(true),
        link: linkField(),
        featured: radioField([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]),
      }),
    },
    defaultProps: {
      ...defaultStyleProps,
      title: 'Latest from Our Blog',
      subtitle: 'Insights, tutorials, and industry news to help you succeed',
      backgroundColor: '#f9fafb',
      titleColor: '#111827',
      viewAllText: 'View All Articles',
      viewAllLink: '#',
      layout: 'featured',
      columns: '3',
      cardStyle: 'modern',
      showAuthor: 'yes',
      showDate: 'yes',
      showReadTime: 'yes',
      showCategory: 'yes',
      articles: [
        {
          title: '10 Tips for Effective Online Learning',
          excerpt:
            'Discover proven strategies to maximize your online learning experience and achieve your educational goals faster.',
          image: '',
          author: 'Sarah Johnson',
          authorAvatar: '',
          date: 'Jan 15, 2025',
          readTime: '5 min read',
          category: 'Learning Tips',
          link: '#',
          featured: 'yes',
        },
        {
          title: 'The Future of EdTech in 2025',
          excerpt:
            'Explore the latest trends shaping the educational technology landscape and what they mean for learners.',
          image: '',
          author: 'Mike Chen',
          authorAvatar: '',
          date: 'Jan 12, 2025',
          readTime: '8 min read',
          category: 'Industry Trends',
          link: '#',
          featured: 'no',
        },
        {
          title: 'Mastering Time Management While Learning',
          excerpt:
            'Practical techniques to balance your learning journey with work and personal life commitments.',
          image: '',
          author: 'Emily Davis',
          authorAvatar: '',
          date: 'Jan 10, 2025',
          readTime: '6 min read',
          category: 'Productivity',
          link: '#',
          featured: 'no',
        },
        {
          title: 'Building a Career in Data Science',
          excerpt:
            'A comprehensive guide to breaking into the data science field, from skills to job search strategies.',
          image: '',
          author: 'David Park',
          authorAvatar: '',
          date: 'Jan 8, 2025',
          readTime: '10 min read',
          category: 'Career Advice',
          link: '#',
          featured: 'no',
        },
      ],
    },
    render: ({
      title,
      subtitle,
      backgroundColor,
      titleColor,
      viewAllText,
      viewAllLink,
      layout,
      columns,
      cardStyle,
      showAuthor,
      showDate,
      showReadTime,
      showCategory,
      articles,
    }: BlogSectionProps) => {
      const cardStyles: Record<NonNullable<BlogSectionProps['cardStyle']>, string> = {
        modern: 'bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl',
        classic: 'bg-white rounded-lg border-2 border-gray-200 overflow-hidden',
        minimal: 'bg-white rounded-xl border-l-4 border-purple-600 overflow-hidden',
        overlay: 'relative rounded-2xl overflow-hidden',
      };

      const featuredArticle = articles?.find((a: BlogArticle) => a.featured === 'yes');
      const regularArticles = articles?.filter((a: BlogArticle) => a.featured !== 'yes');

      const currentCardStyle = cardStyle ?? 'modern';

      const renderArticleCard = (article: BlogArticle, idx: number, isFeatured = false) => {
        if (currentCardStyle === 'overlay') {
          return (
            <a
              key={idx}
              href={article.link ?? '#'}
              className={`${cardStyles[currentCardStyle]} group cursor-pointer transition-all duration-300 hover:-translate-y-1 ${isFeatured ? 'h-[500px]' : 'h-[400px]'}`}>
              <div
                className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600"
                style={{
                  backgroundImage: article.image ? `url(${article.image})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
                {showCategory === 'yes' && article.category ? (
                  <span className="mb-4 inline-block w-fit rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold">
                    {article.category}
                  </span>
                ) : null}
                <h3 className={`mb-3 font-bold ${isFeatured ? 'text-4xl' : 'text-2xl'}`}>
                  {article.title}
                </h3>
                <p className="mb-4 line-clamp-2 opacity-90">{article.excerpt}</p>
                <div className="flex items-center justify-between text-sm opacity-90">
                  {showAuthor === 'yes' && (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-full bg-white/20"
                        style={{
                          backgroundImage: article.authorAvatar
                            ? `url(${article.authorAvatar})`
                            : undefined,
                          backgroundSize: 'cover',
                        }}
                      />
                      <span>{article.author}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {showDate === 'yes' && <span>{article.date}</span>}
                    {showReadTime === 'yes' && <span>{article.readTime}</span>}
                  </div>
                </div>
              </div>
            </a>
          );
        }

        return (
          <a
            key={idx}
            href={article.link ?? '#'}
            className={`${cardStyles[currentCardStyle]} group cursor-pointer transition-all duration-300 hover:-translate-y-1`}>
            <div
              className={`bg-gradient-to-br from-purple-500 to-blue-600 ${isFeatured ? 'h-80' : 'h-48'}`}
              style={{
                backgroundImage: article.image ? `url(${article.image})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
              {showCategory === 'yes' && article.category ? (
                <div className="p-4">
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-purple-600">
                    {article.category}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="p-6">
              <h3
                className={`mb-3 font-bold text-gray-900 transition-colors group-hover:text-purple-600 ${isFeatured ? 'text-3xl' : 'text-xl'}`}>
                {article.title}
              </h3>
              <p className="mb-4 line-clamp-2 text-gray-600">{article.excerpt}</p>
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-sm text-gray-500">
                {showAuthor === 'yes' && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"
                      style={{
                        backgroundImage: article.authorAvatar
                          ? `url(${article.authorAvatar})`
                          : undefined,
                        backgroundSize: 'cover',
                      }}
                    />
                    <span className="font-semibold text-gray-700">{article.author}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {showDate === 'yes' && <span>{article.date}</span>}
                  {showReadTime === 'yes' && <span>• {article.readTime}</span>}
                </div>
              </div>
            </div>
          </a>
        );
      };

      return (
        <div className="px-6 py-20" style={{ backgroundColor }}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="mb-4 text-4xl font-bold md:text-5xl" style={{ color: titleColor }}>
                  {title}
                </h2>
                <p className="max-w-3xl text-xl text-gray-600">{subtitle}</p>
              </div>
              {viewAllText ? (
                <a
                  href={viewAllLink}
                  className="flex items-center gap-2 font-semibold text-purple-600 hover:text-purple-700">
                  {viewAllText} <span>→</span>
                </a>
              ) : null}
            </div>

            {layout === 'featured' && featuredArticle ? (
              <div className="mb-12">{renderArticleCard(featuredArticle, 0, true)}</div>
            ) : null}

            {layout === 'magazine' ? (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  {articles
                    ?.slice(0, 1)
                    .map((article: BlogArticle, idx: number) =>
                      renderArticleCard(article, idx, true)
                    )}
                </div>
                <div className="space-y-8">
                  {articles
                    ?.slice(1, 3)
                    .map((article: BlogArticle, idx: number) =>
                      renderArticleCard(article, idx + 1)
                    )}
                </div>
              </div>
            ) : layout === 'list' ? (
              <div className="space-y-6">
                {articles?.map((article: BlogArticle, idx: number) => (
                  <a
                    key={idx}
                    href={article.link ?? '#'}
                    className="group flex flex-col gap-6 rounded-xl bg-white p-6 transition-all hover:shadow-xl md:flex-row">
                    <div
                      className="h-48 w-full shrink-0 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 md:w-64"
                      style={{
                        backgroundImage: article.image ? `url(${article.image})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}>
                      {showCategory === 'yes' && article.category ? (
                        <div className="p-4">
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-purple-600">
                            {article.category}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-3 text-2xl font-bold text-gray-900 transition-colors group-hover:text-purple-600">
                        {article.title}
                      </h3>
                      <p className="mb-4 text-gray-600">{article.excerpt}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {showAuthor === 'yes' && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"
                              style={{
                                backgroundImage: article.authorAvatar
                                  ? `url(${article.authorAvatar})`
                                  : undefined,
                                backgroundSize: 'cover',
                              }}
                            />
                            <span className="font-semibold text-gray-700">{article.author}</span>
                          </div>
                        )}
                        {showDate === 'yes' && <span>• {article.date}</span>}
                        {showReadTime === 'yes' && <span>• {article.readTime}</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-8`}>
                {(layout === 'featured' ? regularArticles : articles)?.map(
                  (article: BlogArticle, idx: number) => renderArticleCard(article, idx)
                )}
              </div>
            )}
          </div>
        </div>
      );
    },
  };
};

export default BlogSection;
