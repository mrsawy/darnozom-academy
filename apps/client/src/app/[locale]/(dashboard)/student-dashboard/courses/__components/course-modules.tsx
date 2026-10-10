import { Badge } from '@/components/atoms/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/atoms/collapsible';
import { Progress } from '@/components/atoms/progress';
import { IModuleWithContents } from '@/lib/types/course/modules.interface';
import {
  BookOpenCheck,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CircleAlertIcon,
} from 'lucide-react';
import { useState } from 'react';
import { ContentViewer } from './content-viewer';
import { ReviewModal } from '@/components/organs/review-modal';
import { ReviewType } from '@/lib/types/review/review.types';
import { DiscussionSection } from '@/components';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';
import { useTranslations } from 'next-intl';

interface CourseModulesProps {
  modules: IModuleWithContents[];
  completedModules: string[];
  completedContents: string[];
  courseId: string;
  enrollmentId: string;
  /** When false, module-level discussions are hidden (course `settings.discussionEnabled`). */
  courseDiscussionEnabled: boolean;
}

export function CourseModules({
  modules,
  completedModules,
  completedContents,
  courseId,
  enrollmentId,
  courseDiscussionEnabled,
}: CourseModulesProps) {
  const t = useTranslations('StudentCourses.courseModules');
  const [openModules, setOpenModules] = useState<string[]>([modules[0]?._id || '']);

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const getModuleProgress = (module: IModuleWithContents) => {
    const totalContents = module.contents.length;
    const completedModuleContents = completedContents
      ? module.contents.filter((content) => completedContents.includes(content._id)).length
      : 0;
    return totalContents > 0 ? (completedModuleContents / totalContents) * 100 : 0;
  };

  const isModuleCompleted = (moduleId: string) => {
    return completedModules.includes(moduleId);
  };

  return (
    <div className="space-y-4">
      {modules.map((module) => {
        const isCompleted = isModuleCompleted(module._id);
        const progress = getModuleProgress(module);
        const isOpen = openModules.includes(module._id);

        return (
          <Card key={module._id} className={isCompleted ? 'border-green-200' : ''}>
            <Collapsible open={isOpen} onOpenChange={() => toggleModule(module._id)}>
              <CardHeader className="transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="focus-visible:ring-ring -m-2 flex w-full cursor-pointer flex-col items-start gap-3 rounded-md p-2 text-left transition-colors outline-none focus-visible:ring-2 sm:flex-row">
                        <div className="flex shrink-0 items-center gap-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}>
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <CircleAlertIcon className="size-4" />
                            )}
                          </div>
                        </div>
                        <div className="w-full min-w-0">
                          <CardTitle className="text-start text-lg font-semibold">
                            {module.title}
                          </CardTitle>
                          {module.description ? (
                            <p className="text-muted-foreground mt-1 text-start text-sm">
                              {module.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <ReviewModal
                            type={ReviewType.MODULE}
                            entityId={module._id}
                            initialReview={module.userReview ?? null}
                            cacheCourseId={courseId}
                            enrollmentId={enrollmentId}
                          />
                          <Badge variant="outline" className="flex items-center gap-1">
                            <BookOpenCheck className="h-3 w-3" />
                            {module.contents.length} {t('items')}
                          </Badge>
                          {isCompleted ? (
                            <Badge className="bg-green-500">{t('completed')}</Badge>
                          ) : null}
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    {!isCompleted && progress > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t('progress')}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {module.learningObjectives.length > 0 && (
                    <div className="bg-muted/40 mb-4 rounded-lg p-3">
                      <h4 className="mb-2 text-sm font-medium">{t('learningObjectives')}</h4>
                      <ul className="text-muted-foreground space-y-1 text-sm">
                        {module.learningObjectives.map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1 text-blue-500">•</span>
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3">
                    {module.contents.map((content) => (
                      <ContentViewer
                        key={content._id}
                        content={content}
                        courseId={courseId}
                        enrollmentId={enrollmentId}
                        isCompleted={completedContents.includes(content._id)}
                      />
                    ))}
                  </div>

                  {/* Module Discussions */}
                  {courseDiscussionEnabled && module.settings?.discussionEnabled !== false ? (
                    <div className="mt-4">
                      <DiscussionSection
                        type={DiscussionType.MODULE}
                        entityId={courseId}
                        courseId={courseId}
                        moduleId={module._id}
                        title={t('moduleDiscussions')}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
