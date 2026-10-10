import { Card, CardContent } from '@/components/atoms/card';
import { Star, Users, BookOpen, Award } from 'lucide-react';
import { IInstructor } from '@/lib/types/user/user.interface';
import { Typography } from '@/components/atoms/typography';
import { useTranslations } from 'next-intl';

function formatNumber(num?: number) {
  if (!num) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

interface Props {
  instructor: IInstructor;
}

function InstructorStats({ instructor }: Props) {
  const t = useTranslations('Instructors');

  const stats = [
    {
      icon: Star,
      label: t('averageRating'),
      value: instructor.averageCoursesRating ? instructor.averageCoursesRating.toFixed(1) : '0.0',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    {
      icon: Users,
      label: t('totalStudents'),
      value: formatNumber(instructor.totalStudents),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      icon: BookOpen,
      label: t('totalCourses'),
      value: formatNumber(instructor.totalCourses),
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      icon: Award,
      label: t('totalRatings'),
      value: formatNumber(instructor.totalCoursesReviews),
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ];

  return (
    <Card className="sticky top-8">
      <CardContent className="p-6">
        <Typography variant="h4" weight="semibold" className="mb-6">
          {t('statistics')}
        </Typography>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`rounded-lg border-2 p-4 ${stat.bgColor} ${stat.borderColor} transition-all hover:scale-105 hover:shadow-md`}>
                <div className="flex flex-col items-center text-center">
                  <div className={`rounded-lg p-2 ${stat.bgColor} mb-3`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <Typography variant="span" size="2xl" weight="bold" className="mb-1">
                    {stat.value}
                  </Typography>
                  <Typography variant="span" size="xs" color="muted" className="leading-tight">
                    {stat.label}
                  </Typography>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default InstructorStats;
