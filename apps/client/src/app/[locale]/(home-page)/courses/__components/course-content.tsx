'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/atoms/collapsible';
import { ICourseOverview } from '@/lib/types/course/course.interface';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Play,
  Video,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  course: ICourseOverview;
}

function CourseContent({ course }: Props) {
  const t = useTranslations('Courses.singleCourse');

  const totalContents = course.modules.reduce((acc, module) => acc + module.contentsIds.length, 0);
  const duration = course.duration?.trim();

  const getContentIcon = (type: CourseContentType) => {
    switch (type) {
      case CourseContentType.VIDEO: {
        return <Video className="h-4 w-4" />;
      }
      case CourseContentType.ARTICLE: {
        return <FileText className="h-4 w-4" />;
      }
      case CourseContentType.QUIZ: {
        return <ClipboardList className="h-4 w-4" />;
      }
      case CourseContentType.ASSIGNMENT: {
        return <BookOpen className="h-4 w-4" />;
      }
      default: {
        return <Play className="h-4 w-4" />;
      }
    }
  };

  const contentSummary = duration
    ? t('contentSummaryWithDuration', {
        moduleCount: course.modules.length,
        lessonCount: totalContents,
        duration,
      })
    : t('contentSummaryNoDuration', {
        moduleCount: course.modules.length,
        lessonCount: totalContents,
      });

  const contentTypeLabel = (type: CourseContentType) => {
    switch (type) {
      case CourseContentType.ARTICLE: {
        return t('contentTypes.ARTICLE');
      }
      case CourseContentType.VIDEO: {
        return t('contentTypes.VIDEO');
      }
      case CourseContentType.ASSIGNMENT: {
        return t('contentTypes.ASSIGNMENT');
      }
      case CourseContentType.QUIZ: {
        return t('contentTypes.QUIZ');
      }
      case CourseContentType.PROJECT: {
        return t('contentTypes.PROJECT');
      }
      case CourseContentType.LIVE_SESSION: {
        return t('contentTypes.LIVE_SESSION');
      }
      case CourseContentType.ATTACHMENT: {
        return t('contentTypes.ATTACHMENT');
      }
      default: {
        return type;
      }
    }
  };

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0">
        <div className="mb-2 flex items-center gap-4">
          <span className="bg-primary inline-block h-8 w-2 shrink-0 rounded-full" />
          <CardTitle className="text-2xl font-bold sm:text-3xl">{t('courseContent')}</CardTitle>
        </div>
        <p className="text-muted-foreground text-sm font-medium">{contentSummary}</p>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {course.modules.map((module, i) => (
          <Collapsible
            key={module._id}
            className="border-border/50 bg-card group rounded-xl border">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="hover:bg-muted/40 bg-muted/20 flex w-full items-center justify-between rounded-xl p-4 transition-colors group-data-[state=open]:rounded-b-none sm:p-6">
                <div className="flex items-center gap-4">
                  <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="text-left">
                    <span className="text-lg font-bold sm:text-xl">{module.title}</span>
                    <p className="text-muted-foreground mt-1 text-start text-sm font-medium">
                      {t('lessonsCount', {
                        count:
                          Array.isArray(module.contents) && module.contents.length > 0
                            ? module.contents.length
                            : 0,
                      })}
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-muted-foreground h-5 w-5 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="bg-background border-border/50 space-y-6 rounded-b-xl border-t p-4 sm:p-6">
                {module.description ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {module.description}
                  </p>
                ) : null}

                {module.learningObjectives && module.learningObjectives.length > 0 ? (
                  <div>
                    <p className="text-foreground mb-3 text-sm font-bold">
                      {t('learningObjectives')}:
                    </p>
                    <ul className="space-y-3">
                      {module.learningObjectives.map((objective, idx) => (
                        <li
                          key={idx}
                          className="text-muted-foreground flex items-start gap-3 text-sm font-medium">
                          <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(module.contents) && module.contents.length > 0 ? (
                  <div className="space-y-3">
                    {module.contents.map((content) => (
                      <div
                        key={content._id}
                        className="border-border/50 bg-muted/10 hover:bg-muted/20 flex flex-col justify-between gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-primary bg-primary/10 shrink-0 rounded-full p-2.5">
                            {getContentIcon(content.type)}
                          </div>
                          <div>
                            <span className="text-foreground block text-sm font-semibold">
                              {content.title}
                            </span>
                            {content.description ? (
                              <span className="text-muted-foreground mt-1 block text-xs font-medium">
                                {content.description}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="bg-primary/10 text-primary shrink-0 self-start rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase sm:self-auto">
                          {contentTypeLabel(content.type)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}

export default CourseContent;
