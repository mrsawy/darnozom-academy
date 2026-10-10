import { Course } from '@/types/course';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { Progress } from '@/components/atoms/progress';
import { Star, Clock, Users, BookOpen, Play } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const t = useTranslations('CourseCardLegacy');

  const getStatusBadge = () => {
    if (!course.isEnrolled) return null;

    if (course.progress === 100) {
      return <Badge className="bg-completed text-white">{t('completed')}</Badge>;
    } else if (course.progress && course.progress > 0) {
      return <Badge className="bg-in-progress text-white">{t('inProgress')}</Badge>;
    } else {
      return <Badge className="bg-enrolled text-white">{t('enrolled')}</Badge>;
    }
  };

  const getActionButton = () => {
    if (!course.isEnrolled) {
      return (
        <Button className="from-primary to-primary-glow w-full bg-gradient-to-r transition-all duration-300 hover:opacity-90">
          {t('enrollNow')}
        </Button>
      );
    }

    if (course.progress === 100) {
      return (
        <Button variant="secondary" className="w-full">
          <Play className="mr-2 h-4 w-4" />
          {t('reviewCourse')}
        </Button>
      );
    }

    return (
      <Button className="from-primary to-primary-glow w-full bg-gradient-to-r transition-all duration-300 hover:opacity-90">
        <Play className="mr-2 h-4 w-4" />
        {t('continueLearning')}
      </Button>
    );
  };

  return (
    <Card
      className="group bg-card h-full overflow-hidden border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <CardHeader className="relative p-0">
        <div className="from-primary/10 to-primary-glow/10 relative aspect-video overflow-hidden bg-gradient-to-br">
          <Image
            src={course.image}
            alt={course.title}
            width={400}
            height={225}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute top-4 left-4">{getStatusBadge()}</div>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="text-foreground bg-white/90">
              {course.level}
            </Badge>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {course.category}
          </Badge>
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <Star className="fill-warning text-warning h-4 w-4" />
            <span className="font-medium">{course.rating}</span>
            <span>({course.studentsCount.toLocaleString()})</span>
          </div>
        </div>

        <h3 className="group-hover:text-primary mb-2 line-clamp-2 text-lg font-semibold transition-colors">
          {course.title}
        </h3>

        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">{course.description}</p>

        <div className="text-muted-foreground mb-3 text-sm">
          {t('byInstructor', { instructor: course.instructor })}
        </div>

        <div className="text-muted-foreground mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {course.duration}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {t('lessonsCount', { count: course.lessonsCount })}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {course.studentsCount.toLocaleString()}
          </div>
        </div>

        {course.isEnrolled && course.progress !== undefined && course.progress < 100 ? (
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{t('progress')}</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-1">
          {course.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <div className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary text-2xl font-bold">${course.price}</span>
              {course.originalPrice ? (
                <span className="text-muted-foreground text-sm line-through">
                  ${course.originalPrice}
                </span>
              ) : null}
            </div>
          </div>
          {getActionButton()}
        </div>
      </CardFooter>
    </Card>
  );
}
