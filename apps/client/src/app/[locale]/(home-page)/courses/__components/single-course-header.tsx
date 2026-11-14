import { Badge } from '@/components/atoms/badge';
import { ICourseWithModules } from '@/lib/types/course/course.interface';
import { BookOpen, Clock, Star, Users } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

interface Props {
  course: ICourseWithModules;
}

function SingleCourseHeader({ course }: Props) {
  const t = useTranslations('Courses.singleCourse');
  const format = useFormatter();
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const ageRangeNames = (course.ageRanges ?? []).map((a) => (isArabic ? a.nameAr : a.nameEn));

  const updatedDateLabel = (() => {
    if (!course.updatedAt) return '';
    const parsed = new Date(course.updatedAt);
    if (Number.isNaN(parsed.getTime())) {
      return String(course.updatedAt);
    }
    return format.dateTime(parsed, { dateStyle: 'medium' });
  })();

  const totalEnrollments =
    (course.stats as { totalEnrollments?: number } | undefined)?.totalEnrollments ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {/* <Badge variant="secondary">{course.level}</Badge> */}
        {totalEnrollments > 10 ? <Badge variant="outline">{t('bestseller')}</Badge> : null}

        {course.updatedAt ? (
          <Badge variant="outline">{t('updated', { date: updatedDateLabel })}</Badge>
        ) : null}
        {!course.isPaid && (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            {t('free')}
          </Badge>
        )}
        {ageRangeNames.map((name) => (
          <Badge key={name} variant="secondary">
            {name}
          </Badge>
        ))}
      </div>

      <h1 className="text-4xl font-bold tracking-tight">{course.name}</h1>
      <p className="text-muted-foreground text-xl">{course.shortDescription}</p>

      <div className="text-muted-foreground flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-1">
          <Star className="fill-primary text-primary h-4 w-4" />
          <span className="text-foreground font-medium">{course.stats?.averageRating}</span>
          <span>{t('reviewsCount', { count: course.stats?.totalReviews ?? 0 })}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{t('studentsCount', { count: totalEnrollments })}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {/* <span>{course.duration}</span> */}
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="h-4 w-4" />
          <span>{t('modulesCount', { count: course.modules.length })}</span>
        </div>
      </div>
    </div>
  );
}

export default SingleCourseHeader;
