import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { ROUTE_INSTRUCTOR_DETAIL } from '@/lib/data/constants/routes.constants';
import { ICourseWithModules } from '@/lib/types/course/course.interface';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { Link } from '@/i18n/navigation';
import { BookOpen, Star, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  course: ICourseWithModules;
}

const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

function InstructorCard({ course }: Props) {
  const t = useTranslations('Instructors');
  const instructor = course.instructor;

  const avatarSrc = instructor?.profile?.avatar
    ? getFileFullUrl(instructor.profile.avatar)
    : undefined;

  const displayName = instructor
    ? [instructor.firstName, instructor.lastName].filter(Boolean).join(' ')
    : '';

  const reviewCount = instructor?.totalCoursesReviews ?? 0;
  const showRating = reviewCount > 0;
  const rating = instructor?.averageCoursesRating ?? 0;
  const students = instructor?.totalStudents ?? 0;
  const coursesCount = instructor?.totalCourses ?? 0;

  const instructorId = instructor?._id;

  const card = (
    <Card
      className={
        instructorId
          ? 'hover:bg-muted/50 border-border/80 hover:border-primary/40 cursor-pointer transition-colors'
          : undefined
      }>
      <CardHeader>
        <CardTitle>{t('instructor')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
            <AvatarFallback>{displayName || '?'}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{displayName || '—'}</h3>
            {instructor?.username ? (
              <p className="text-muted-foreground">{instructor.username}</p>
            ) : null}
            <div className="flex flex-wrap gap-4 text-sm">
              {showRating ? (
                <div className="flex items-center gap-1">
                  <Star className="fill-primary text-primary h-4 w-4 shrink-0" />
                  <span className="font-medium">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">{t('rating')}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 shrink-0" />
                <span className="font-medium">{formatNumber(students)}</span>
                <span className="text-muted-foreground">{t('students')}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="font-medium">{coursesCount.toLocaleString()}</span>
                <span className="text-muted-foreground">{t('courses')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (instructorId) {
    return (
      <Link
        href={ROUTE_INSTRUCTOR_DETAIL(instructorId)}
        className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none">
        {card}
      </Link>
    );
  }

  return card;
}

export default InstructorCard;
