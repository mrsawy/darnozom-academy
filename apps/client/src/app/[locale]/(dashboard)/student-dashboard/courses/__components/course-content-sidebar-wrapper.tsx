'use client';

import { Sidebar, SidebarContent } from '@/components/atoms/sidebar';
import { useLocale } from 'next-intl';
import { CourseContentSidebar } from './course-content-sidebar';
import { ICourseOverview } from '@/lib/types/course/course.interface';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';
import { IUser } from '@/lib/types/user/user.interface';
import { usePathname } from 'next/navigation';
import { CourseContentSidebarSkeleton } from './course-content-sidebar.skeleton';
import CourseContentSidebarError from './content-side-bar-error';

interface CourseContentSidebarWrapperProps {
  course?: ICourseOverview;
  enrollment?: IEnrollment;
  currentContentId?: string;
  user?: IUser;
  loading?: boolean;
  isError?: boolean;
}

export function CourseContentSidebarWrapper({
  course,
  enrollment,
  currentContentId,
  user,
  loading = false,
  isError,
}: CourseContentSidebarWrapperProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const pathname = usePathname();

  // Extract contentId from pathname if not provided
  const contentIdFromPath = pathname?.split('/').pop();
  const activeContentId =
    currentContentId ??
    (contentIdFromPath && contentIdFromPath !== enrollment?._id ? contentIdFromPath : undefined);

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      side={isRTL ? 'left' : 'right'} // Opposite side of the main sidebar
      className="m-2 me-0 overflow-hidden rounded-s-2xl border bg-white p-0 dark:bg-slate-900">
      <SidebarContent className="overflow-hidden p-0">
        {loading ? (
          <CourseContentSidebarSkeleton />
        ) : isError ? (
          <CourseContentSidebarError />
        ) : course && enrollment ? (
          <CourseContentSidebar
            course={course}
            enrollment={enrollment}
            currentContentId={activeContentId}
            user={user}
          />
        ) : (
          <CourseContentSidebarError />
        )}
      </SidebarContent>
    </Sidebar>
  );
}
