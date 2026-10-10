import Image from 'next/image';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Star, Users, BookOpen, Share2, MessageCircle } from 'lucide-react';
import { getFileFullUrl } from '@/lib/utils/getFileFullUrl';
import { IInstructor } from '@/lib/types/user/user.interface';
import { Typography } from '@/components/atoms/typography';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ROUTE_CHAT_WITH_USER } from '@/lib/data/constants/routes.constants';

function formatNumber(num?: number) {
  if (!num) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

interface Props {
  instructor: IInstructor;
}

function InstructorProfileHeader({ instructor }: Props) {
  const t = useTranslations('Instructors');
  const avatarUrl = instructor.profile?.avatar
    ? getFileFullUrl(instructor.profile.avatar)
    : '/images/default-avatar.png';

  const averageRating = instructor.averageCoursesRating ?? 0;
  const totalRatings = instructor.totalCoursesReviews ?? 0;
  const totalStudents = instructor.totalStudents ?? 0;
  const totalCourses = instructor.totalCourses ?? 0;

  return (
    <div className="from-background via-background to-muted/20 border-b bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
          {/* Avatar */}
          <div className="border-background ring-primary/10 relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-full border-4 shadow-xl ring-4 md:h-40 md:w-40 lg:h-48 lg:w-48">
            <Image
              src={avatarUrl}
              alt={`${instructor.firstName} ${instructor.lastName}`}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Content */}
          <div className="w-full flex-1 text-center md:text-left">
            <Typography
              as="h1"
              variant="h1"
              weight="bold"
              align="center"
              className="mb-2 flex justify-center md:justify-start md:text-left">
              {instructor.firstName} {instructor.lastName}
            </Typography>
            <Typography
              variant="lead"
              color="muted"
              align="center"
              className="mb-6 flex justify-center md:justify-start md:text-left">
              {instructor.profile?.shortBio ?? t('expertInstructor')}
            </Typography>

            {/* Stats Row */}
            <div className="mb-6 flex flex-nowrap items-center justify-center gap-1 sm:flex-wrap sm:gap-4 md:justify-start md:gap-6">
              {averageRating > 0 && (
                <div className="bg-card flex items-center gap-2 rounded-lg border px-2 py-2 shadow-sm sm:px-4">
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                  <Typography variant="span" weight="semibold">
                    {averageRating.toFixed(1)}
                  </Typography>
                  {totalRatings > 0 && (
                    <Typography variant="span" size="sm" color="muted">
                      ({formatNumber(totalRatings)})
                    </Typography>
                  )}
                </div>
              )}
              {totalStudents > 0 && (
                <div className="bg-card flex items-center gap-2 rounded-lg border px-2 py-2 shadow-sm sm:px-4">
                  <Users className="h-5 w-5 text-blue-500" />
                  <Typography variant="span" weight="medium">
                    {formatNumber(totalStudents)}
                  </Typography>
                  <Typography variant="span" size="sm" color="muted">
                    {t('students')}
                  </Typography>
                </div>
              )}
              {totalCourses > 0 && (
                <div className="bg-card flex items-center gap-2 rounded-lg border px-2 py-2 shadow-sm sm:px-4">
                  <BookOpen className="h-5 w-5 text-green-500" />
                  <Typography variant="span" weight="medium">
                    {formatNumber(totalCourses)}
                  </Typography>
                  <Typography variant="span" size="sm" color="muted">
                    {t('courses')}
                  </Typography>
                </div>
              )}
            </div>

            {/* Categories */}
            {instructor.categories && instructor.categories.length > 0 ? (
              <div className="mb-6 flex flex-wrap justify-center gap-2 md:justify-start">
                {instructor.categories.map((category) => (
                  <Badge
                    key={category._id}
                    variant="outline"
                    className="hover:bg-primary/10 px-3 py-1 text-sm transition-colors">
                    {category.name}
                  </Badge>
                ))}
              </div>
            ) : null}

            {/* Message button */}
            <div className="mb-4 flex justify-center md:justify-start">
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTE_CHAT_WITH_USER(instructor._id)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('messageInstructor')}
                </Link>
              </Button>
            </div>

            {/* Social Links */}
            {instructor.profile?.socialLinks?.linkedin ||
            instructor.profile?.socialLinks?.twitter ? (
              <div className="flex justify-center gap-4 md:justify-start">
                {instructor.profile.socialLinks.linkedin ? (
                  <a
                    href={instructor.profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary hover:bg-muted rounded-lg p-2 transition-colors"
                    aria-label={t('linkedinProfile')}>
                    <Share2 className="h-5 w-5" />
                  </a>
                ) : null}
                {instructor.profile.socialLinks.twitter ? (
                  <a
                    href={instructor.profile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary hover:bg-muted rounded-lg p-2 transition-colors"
                    aria-label={t('twitterProfile')}>
                    <Share2 className="h-5 w-5" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructorProfileHeader;
