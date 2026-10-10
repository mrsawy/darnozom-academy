'use client';

import { Button } from '@/components/atoms/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/atoms/collapsible';
import { Sheet, SheetContent, SheetTrigger } from '@/components/atoms/sheet';
import { ICourseOverview } from '@/lib/types/course/course.interface';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { IContent } from '@/lib/types/course/content.interface';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import { ROUTE_STUDENT_COURSE_CONTENT } from '@/lib/data/constants/routes.constants';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  HelpCircle,
  PenTool,
  MoreVertical,
  List,
  Calendar,
  Paperclip,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/atoms/avatar';
import { IUser } from '@/lib/types/user/user.interface';

interface CourseContentSidebarProps {
  course: ICourseOverview;
  enrollment: IEnrollment;
  currentContentId?: string;
  user?: IUser;
}

export function CourseContentSidebar({
  course,
  enrollment,
  currentContentId,
  user,
}: CourseContentSidebarProps) {
  const t = useTranslations('StudentCourses.contentView');
  const router = useRouter();

  // Find the module that contains the current content
  const getInitialOpenModules = () => {
    if (!currentContentId) {
      return course.modules.length > 0 ? [course.modules[0]._id] : [];
    }

    // Find which module contains the current content
    const moduleWithCurrentContent = course.modules.find((module) =>
      module.contents.some((content) => content._id === currentContentId)
    );

    if (moduleWithCurrentContent) {
      return [moduleWithCurrentContent._id];
    }

    // Fallback to first module if not found
    return course.modules.length > 0 ? [course.modules[0]._id] : [];
  };

  const [openModules, setOpenModules] = useState<string[]>(getInitialOpenModules());

  // Update open modules when currentContentId changes
  useEffect(() => {
    if (currentContentId) {
      const moduleWithCurrentContent = course.modules.find((module) =>
        module.contents.some((content) => content._id === currentContentId)
      );

      if (moduleWithCurrentContent) {
        setOpenModules((prev) => {
          if (!prev.includes(moduleWithCurrentContent._id)) {
            return [moduleWithCurrentContent._id];
          }
          return prev;
        });
      }
    }
  }, [currentContentId, course.modules]);

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  // Calculate progress
  const totalContents = course.modules.reduce((sum, module) => sum + module.contents.length, 0);
  const completedContents = enrollment.progress.completedContents.length;
  const progressPercentage = totalContents > 0 ? (completedContents / totalContents) * 100 : 0;

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
      case CourseContentType.LIVE_SESSION: {
        return <Calendar className="h-4 w-4" />;
      }
      case CourseContentType.ATTACHMENT: {
        return <Paperclip className="h-4 w-4" />;
      }
      default: {
        return <FileText className="h-4 w-4" />;
      }
    }
  };

  const isModuleCompleted = (moduleId: string) => {
    return enrollment.progress.completedModules.includes(moduleId);
  };

  const handleContentClick = (contentId: string) => {
    router.push(ROUTE_STUDENT_COURSE_CONTENT(enrollment._id ?? '', contentId));
  };

  const getContentDuration = (content: IContent) => {
    if (content.quizDurationInMinutes) {
      return `${content.quizDurationInMinutes} ${t('minutes')}`;
    }
    // You can add more duration logic here for videos/articles
    return null;
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Sidebar content component (reusable for desktop and mobile)
  function SidebarContent() {
    return (
      <div className="flex h-full flex-col">
        {/* Course Progress Header */}
        <div className="space-y-4 border-b border-slate-200 p-6 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{t('courseContent')}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {completedContents}/{totalContents} {t('completed')}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto">
          {course.modules.map((module) => {
            const isCompleted = isModuleCompleted(module._id);
            const isOpen = openModules.includes(module._id);
            const completedCount = module.contents.filter((content) =>
              enrollment.progress.completedContents.includes(content._id)
            ).length;

            return (
              <div key={module._id} className="border-b border-slate-300 dark:border-slate-800">
                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleModule(module._id)}
                  className="cursor-pointer transition-all">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="text-right text-sm font-bold">{module.title}</span>
                      </div>
                      {isCompleted ? (
                        <span className="text-[10px] font-bold text-green-500 uppercase">
                          {t('completed')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">
                          {completedCount}/{module.contents.length}
                        </span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="py-1">
                      {module.contents.map((content) => {
                        const isCompleted = enrollment.progress.completedContents.includes(
                          content._id
                        );
                        const isActive = currentContentId === content._id;

                        return (
                          <button
                            type="button"
                            key={content._id}
                            onClick={() => handleContentClick(content._id)}
                            className={`flex w-full cursor-pointer items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-primary/15 border-primary border-r-3' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}>
                            <div className={`${isActive ? 'text-primary' : 'text-slate-400'}`}>
                              {getContentIcon(content.type)}
                            </div>
                            <div className="min-w-0 flex-1 text-right">
                              <p
                                className={`truncate text-sm font-medium ${isActive ? 'text-primary' : 'text-slate-900 dark:text-slate-100'}`}>
                                {content.title}
                              </p>
                              {getContentDuration(content) && (
                                <p className="text-[10px] text-slate-500">
                                  {getContentDuration(content)}
                                </p>
                              )}
                            </div>
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-slate-700" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>

        {/* User Profile Footer */}
        {user ? (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="from-primary bg-gradient-to-tr to-purple-400 font-bold text-white">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-[10px] text-slate-500">{user.email}</p>
              </div>
              <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Return just the content (for use in Sidebar component)
  return <SidebarContent />;
}

// Export a version that includes mobile sheet for standalone use
export function CourseContentSidebarWithMobile({
  course,
  enrollment,
  currentContentId,
  user,
}: CourseContentSidebarProps) {
  const t = useTranslations('StudentCourses.contentView');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden h-[calc(100vh-4rem)] w-80 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        <CourseContentSidebar
          course={course}
          enrollment={enrollment}
          currentContentId={currentContentId}
          user={user}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="bg-primary hover:bg-primary/90 fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full text-white shadow-2xl lg:hidden">
            <List className="h-6 w-6" />
            <span className="sr-only">{t('openCourseContent')}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0">
          <CourseContentSidebar
            course={course}
            enrollment={enrollment}
            currentContentId={currentContentId}
            user={user}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
