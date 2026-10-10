import React from 'react';
import { getAuthUser } from '@/lib/actions/user/user.action';
import CourseContentLayoutClient from './layout-client';

export const dynamic = 'force-dynamic';

interface CourseContentLayoutProps {
  children: React.ReactNode;
}

export default async function CourseContentLayout({ children }: CourseContentLayoutProps) {
  const user = await getAuthUser();

  return <CourseContentLayoutClient user={user}>{children}</CourseContentLayoutClient>;
}
