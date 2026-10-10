'use client';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { CourseBreadcrumb } from '@/components/molecules/course-breadcrumb';
import { ROUTE_STUDENT_COURSES, ROUTE_STUDENT_COURSE } from '@/lib/data/constants/routes.constants';
import { useDetailedEnrolledCourse } from '@/lib/hooks/course/useDetailedEnrolledCourse';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import {
  ArrowLeft,
  CalendarRange,
  Clock,
  FileText,
  HelpCircle,
  Paperclip,
  PenTool,
  Play,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import VideoContent from './video-content';
import ArticleContent from './article-content';
import QuizContent from './quiz/quiz-content';
import AssignmentContent from './assignment-content';
import AttachmentContent from './attachment-content';
import LiveSessionContent from './live-session-content';
import { IContentProgressItem } from '@/lib/types/enrollment/enrollment.interface';
import {
  recordContentAccess,
  recordTimeSpent,
  updateVideoProgress,
} from '@/lib/actions/enrollment/progress.action';
import { useParams } from 'next/navigation';
import { DiscussionSection } from '@/components';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';
import { useFormatter, useTranslations } from 'next-intl';

import { useSidebar } from '@/components/atoms/sidebar';
import { useSingleContentInEnrollment } from '@/lib/hooks/course/content/useContent';
import { ContentViewSkeleton } from './content-view.skeleton';
import { AiModalProvider } from '@/app/[locale]/(dashboard)/student-dashboard/__components/ai-modal-provider';

const TIME_TRACKING_INTERVAL_MS = 30_000; // 30 seconds
const MINUTES_PER_INTERVAL = 0.5;

const KNOWN_CONTENT_TYPES = new Set<string>(Object.values(CourseContentType));

export default function ContentView() {
  const params = useParams();
  const enrollmentId = params.id as string;
  const contentId = params.contentId as string;
  const { data, isPending, isError, error, refetch } = useSingleContentInEnrollment(
    enrollmentId,
    contentId
  );

  const t = useTranslations('StudentCourses.contentView');
  const tContentTypes = useTranslations('StudentCourses.contentTypes');
  const tCrumb = useTranslations('CourseBreadcrumb');
  const format = useFormatter();

  const { data: detailed } = useDetailedEnrolledCourse(enrollmentId);
  const courseName = detailed?.course.name;

  const formatQuizDate = (value: string | Date | undefined) => {
    if (value === undefined) return '';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '';
    return format.dateTime(d, { dateStyle: 'medium', timeStyle: 'short' });
  };
  const { toggleSidebar } = useSidebar();

  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!data?.content?._id) return;
    setIsComplete(data.progress.completedContents.includes(data.content._id));
  }, [data]);

  // Record content access on mount and set up time-tracking interval
  useEffect(() => {
    if (!data || !enrollmentId) return;
    const { content } = data;
    void recordContentAccess({
      enrollmentId,
      contentId: content._id,
      contentTitle: content.title,
      contentType: content.type,
    });
  }, [data, enrollmentId]);

  useEffect(() => {
    if (!data || !enrollmentId) return;
    const { content } = data;
    const id = setInterval(() => {
      void recordTimeSpent({
        enrollmentId,
        contentId: content._id,
        additionalMinutes: MINUTES_PER_INTERVAL,
      });
    }, TIME_TRACKING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [data, enrollmentId]);

  if (isPending) {
    return <ContentViewSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-linear-to-br">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">{t('failedToLoad')}</p>
          {error instanceof Error ? (
            <p className="text-muted-foreground mb-6 text-sm">{error.message}</p>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  const { content, progress, discussionAllowed } = data;

  const contentTypeLabel =
    content.type && KNOWN_CONTENT_TYPES.has(content.type)
      ? tContentTypes(content.type as keyof typeof CourseContentType)
      : (content.type ?? 'Content');

  const contentProgressItem: IContentProgressItem | null | undefined =
    progress.contentTimeTracking?.find(
      (track) => String(track.contentId) === String(content._id)
    ) ?? null;

  const handleSaveVideoProgress = async (positionSeconds: number) => {
    if (!enrollmentId || !content._id) return;
    void updateVideoProgress({ enrollmentId, contentId: content._id, positionSeconds });
  };

  const getContentIcon = (type: CourseContentType) => {
    switch (type) {
      case CourseContentType.VIDEO: {
        return <Play className="h-6 w-6" />;
      }
      case CourseContentType.ARTICLE: {
        return <FileText className="h-6 w-6" />;
      }
      case CourseContentType.ASSIGNMENT: {
        return <PenTool className="h-6 w-6" />;
      }
      case CourseContentType.QUIZ: {
        return <HelpCircle className="h-6 w-6" />;
      }
      case CourseContentType.LIVE_SESSION: {
        return <Video className="h-6 w-6" />;
      }
      case CourseContentType.ATTACHMENT: {
        return <Paperclip className="h-6 w-6" />;
      }
      default: {
        return <FileText className="h-6 w-6" />;
      }
    }
  };
  const renderContent = () => {
    switch (content.type) {
      case CourseContentType.VIDEO: {
        return (
          <VideoContent
            content={content}
            isComplete={isComplete}
            contentProgressItem={contentProgressItem ?? undefined}
            onSaveVideoProgress={(positionSeconds) => void handleSaveVideoProgress(positionSeconds)}
          />
        );
      }
      case CourseContentType.ARTICLE: {
        return <ArticleContent content={content} isComplete={isComplete} />;
      }
      case CourseContentType.QUIZ: {
        return <QuizContent content={content} isComplete={isComplete} />;
      }
      case CourseContentType.ASSIGNMENT: {
        return <AssignmentContent content={content} />;
      }
      case CourseContentType.LIVE_SESSION: {
        return <LiveSessionContent content={content} isComplete={isComplete} />;
      }
      case CourseContentType.ATTACHMENT: {
        return <AttachmentContent content={content} isComplete={isComplete} />;
      }
      default: {
        return (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-24 w-24" />
            <p className="text-xl text-gray-600">{t('contentNotAvailable')}</p>
          </div>
        );
      }
    }
  };

  const showAiModal =
    content.type === CourseContentType.VIDEO ||
    content.type === CourseContentType.ARTICLE ||
    content.type === CourseContentType.ATTACHMENT;

  return (
    <div className="min-h-screen bg-linear-to-br">
      {/* Main Content */}
      <div className="w-full">
        <div className="container mx-auto px-4 py-8">
          {courseName ? (
            <CourseBreadcrumb
              items={[
                { label: tCrumb('myCourses'), href: ROUTE_STUDENT_COURSES },
                { label: courseName, href: ROUTE_STUDENT_COURSE(enrollmentId) },
                { label: tCrumb('content') },
                { label: content.title },
              ]}
            />
          ) : null}

          {/* Header */}
          <div className="mb-8 flex flex-col">
            <Button
              variant="ghost"
              onClick={() => {
                toggleSidebar();
              }}
              className="mb-6 flex flex-col self-end">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('courseContent')}
            </Button>

            <div className="rounded-lg border p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                  {getContentIcon(content.type)}
                </div>
                <div className="flex w-full justify-between">
                  <div>
                    <h1 className="mb-2 text-3xl font-bold">{content.title}</h1>
                    {content.description ? (
                      <p className="mb-3 text-lg">{content.description}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        {contentTypeLabel}
                      </Badge>
                      {content.type === CourseContentType.QUIZ && content.quizStartDate ? (
                        <Badge variant="outline" className="flex items-center gap-1 text-sm">
                          <CalendarRange className="h-3 w-3 shrink-0" />
                          <span className="font-medium">{t('quizStarts')}</span>
                          <span>{formatQuizDate(content.quizStartDate)}</span>
                        </Badge>
                      ) : null}
                      {content.type === CourseContentType.QUIZ && content.quizEndDate ? (
                        <Badge variant="outline" className="flex items-center gap-1 text-sm">
                          <CalendarRange className="h-3 w-3 shrink-0" />
                          <span className="font-medium">{t('quizEnds')}</span>
                          <span>{formatQuizDate(content.quizEndDate)}</span>
                        </Badge>
                      ) : null}
                      {content.quizDurationInMinutes ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {content.quizDurationInMinutes} {t('minutes')}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    {isComplete ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {t('completed')}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="rounded-lg border p-8 shadow-sm">{renderContent()}</div>

          {/* Content Discussions */}
          {discussionAllowed ? (
            <DiscussionSection
              type={DiscussionType.CONTENT}
              entityId={content.courseId}
              courseId={content.courseId}
              moduleId={content.moduleId}
              contentId={content._id}
              title={t('contentDiscussions')}
            />
          ) : null}
        </div>
      </div>

      {showAiModal ? <AiModalProvider contentId={content._id} /> : null}
    </div>
  );
}
