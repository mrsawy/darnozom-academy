'use client';
import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Link, usePathname } from '@/i18n/navigation';
import { IContent } from '@/lib/types/course/content.interface';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import {
  Calendar,
  Clock,
  FileText,
  HelpCircle,
  Paperclip,
  PenTool,
  Play,
  Video,
} from 'lucide-react';
import { ReviewModal } from '@/components/organs/review-modal';
import { ReviewType } from '@/lib/types/review/review.types';
import { useTranslations } from 'next-intl';

const KNOWN_CONTENT_TYPES = new Set<string>(Object.values(CourseContentType));

interface ContentViewerProps {
  content: IContent;
  isCompleted: boolean;
  courseId: string;
  enrollmentId: string;
}

export function ContentViewer({
  content,
  isCompleted = false,
  courseId,
  enrollmentId,
}: ContentViewerProps) {
  const t = useTranslations('StudentCourses.contentViewer');
  const tContentTypes = useTranslations('StudentCourses.contentTypes');
  const pathName = usePathname();

  const contentTypeLabel =
    content.type && KNOWN_CONTENT_TYPES.has(content.type)
      ? tContentTypes(content.type as keyof typeof CourseContentType)
      : (content.type ?? 'Content');

  const getContentIcon = (type: CourseContentType) => {
    switch (type) {
      case CourseContentType.VIDEO: {
        return <Play className="h-4 w-4" />;
      }
      case CourseContentType.ARTICLE: {
        return <FileText className="h-4 w-4" />;
      }
      case CourseContentType.ASSIGNMENT: {
        return <PenTool className="h-4 w-4" />;
      }
      case CourseContentType.QUIZ: {
        return <HelpCircle className="h-4 w-4" />;
      }
      case CourseContentType.ATTACHMENT: {
        return <Paperclip className="h-4 w-4" />;
      }
      case CourseContentType.LIVE_SESSION: {
        return <Video className="h-4 w-4" />;
      }
      default: {
        return <FileText className="h-4 w-4" />;
      }
    }
  };

  const getContentTypeColor = (type: CourseContentType) => {
    switch (type) {
      case CourseContentType.VIDEO: {
        return 'bg-blue-500';
      }
      case CourseContentType.ARTICLE: {
        return 'bg-green-500';
      }
      case CourseContentType.ASSIGNMENT: {
        return 'bg-orange-500';
      }
      case CourseContentType.QUIZ: {
        return 'bg-purple-500';
      }
      case CourseContentType.ATTACHMENT: {
        return 'bg-slate-500';
      }
      case CourseContentType.LIVE_SESSION: {
        return 'bg-rose-500';
      }
      default: {
        return 'bg-gray-500';
      }
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    return `${minutes} ${t('min')}`;
  };

  const contentHref = `${pathName}/${content._id}`;

  return (
    <Card className="mb-6 w-full transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={contentHref}
            className="text-foreground focus-visible:ring-ring min-w-0 flex-1 rounded-md transition-opacity outline-none hover:opacity-90 focus-visible:ring-2">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className={`rounded-lg p-2 ${getContentTypeColor(content.type)}`}>
                {getContentIcon(content.type)}
              </div>
              <div className="w-full min-w-0 text-center">
                <CardTitle className="text-base font-medium">{content.title}</CardTitle>
                {content.description ? (
                  <p className="text-muted-foreground mt-1 text-sm">{content.description}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ReviewModal
                  type={ReviewType.CONTENT}
                  entityId={content._id}
                  initialReview={content.userReview ?? null}
                  cacheCourseId={courseId}
                  enrollmentId={enrollmentId}
                />
                <Badge
                  variant="outline"
                  className={getContentTypeColor(content.type).replace('bg-', 'border-')}>
                  {contentTypeLabel}
                </Badge>
                {isCompleted ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {t('completed')}
                  </Badge>
                ) : null}
              </div>
            </div>
          </Link>
        </div>
      </CardHeader>

      {content.quizDurationInMinutes ||
      content.maxPoints ||
      content.dueDate ||
      content.startDate ? (
        <Link
          href={contentHref}
          className="text-foreground focus-visible:ring-ring block rounded-md transition-opacity outline-none hover:opacity-90 focus-visible:ring-2">
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-4 text-sm">
                {content.quizDurationInMinutes ? (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(content.quizDurationInMinutes)}</span>
                  </div>
                ) : null}
                {content.maxPoints ? (
                  <span>
                    {content.maxPoints} {t('points')}
                  </span>
                ) : null}
                {content.dueDate ? (
                  <span>
                    {t('due')} {new Date(content.dueDate).toLocaleDateString()}
                  </span>
                ) : null}
                {content.type === CourseContentType.ATTACHMENT &&
                (content.fileSizeBytes ?? content.mimeType) ? (
                  <span>
                    {content.mimeType ? `${content.mimeType}` : null}
                    {content.mimeType && content.fileSizeBytes ? ' · ' : null}
                    {content.fileSizeBytes
                      ? `${Math.round(content.fileSizeBytes / 1024)} KB`
                      : null}
                  </span>
                ) : null}
                {content.type === CourseContentType.LIVE_SESSION && content.startDate ? (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(content.startDate).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </div>

            {content.type === CourseContentType.QUIZ && content.questions ? (
              <div className="text-muted-foreground mt-3 text-sm">
                {content.questions.length}{' '}
                {content.questions.length === 1 ? t('questions') : t('questionsPlural')}
              </div>
            ) : null}
          </CardContent>
        </Link>
      ) : null}
    </Card>
  );
}
