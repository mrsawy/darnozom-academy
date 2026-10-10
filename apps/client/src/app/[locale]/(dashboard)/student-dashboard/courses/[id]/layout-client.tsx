'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/atoms/sidebar';
import { IUser } from '@/lib/types/user/user.interface';
import { CourseContentSidebarWrapper } from '../__components/course-content-sidebar-wrapper';

import { useParams, usePathname } from 'next/navigation';
import { useDetailedEnrolledCourse } from '@/lib/hooks/course/useDetailedEnrolledCourse';

interface CourseContentLayoutClientProps {
  children: React.ReactNode;
  user?: IUser;
}

export default function CourseContentLayoutClient({
  children,
  user,
}: CourseContentLayoutClientProps) {
  const pathname = usePathname();
  const params = useParams();
  const enrollmentId = params.id as string;
  const { data: detailedEnrolledCourse, isLoading: isLoadingDetailedEnrolledCourse } =
    useDetailedEnrolledCourse(enrollmentId);

  // Extract contentId from pathname: /student-dashboard/courses/[id]/[contentId]
  const pathParts = pathname?.split('/') || [];
  const coursesIndex = pathParts.indexOf('courses');
  const currentContentId =
    coursesIndex !== -1 &&
    pathParts[coursesIndex + 2] &&
    pathParts[coursesIndex + 2] !== detailedEnrolledCourse?.enrollment._id
      ? pathParts[coursesIndex + 2]
      : undefined;

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
        } as React.CSSProperties
      }>
      <SidebarInset>{children}</SidebarInset>
      <CourseContentSidebarWrapper
        course={detailedEnrolledCourse?.course}
        enrollment={detailedEnrolledCourse?.enrollment}
        currentContentId={currentContentId}
        user={user}
        loading={isLoadingDetailedEnrolledCourse}
      />
    </SidebarProvider>
  );
}
