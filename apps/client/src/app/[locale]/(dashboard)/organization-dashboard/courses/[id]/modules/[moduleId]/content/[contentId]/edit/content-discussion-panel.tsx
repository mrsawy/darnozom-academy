'use client';

import { DiscussionSection } from '@/components/organs/discussion/discussion-section';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';
import { useTranslations } from 'next-intl';

interface ContentDiscussionPanelProps {
  courseId: string;
  moduleId: string;
  contentId: string;
  canDeleteAny?: boolean;
}

export function ContentDiscussionPanel({
  courseId,
  moduleId,
  contentId,
  canDeleteAny,
}: ContentDiscussionPanelProps) {
  const t = useTranslations('StudentCourses.discussion');

  return (
    <DiscussionSection
      type={DiscussionType.CONTENT}
      entityId={courseId}
      courseId={courseId}
      moduleId={moduleId}
      contentId={contentId}
      canDeleteAny={canDeleteAny}
      title={t('defaultTitle')}
    />
  );
}
