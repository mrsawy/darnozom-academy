'use client';

import { DiscussionSection } from '@/components/organs/discussion/discussion-section';
import { DiscussionType } from '@/lib/types/discussion/discussion.types';
import { useTranslations } from 'next-intl';

interface ModuleDiscussionPanelProps {
  courseId: string;
  moduleId: string;
  canDeleteAny?: boolean;
}

export function ModuleDiscussionPanel({
  courseId,
  moduleId,
  canDeleteAny,
}: ModuleDiscussionPanelProps) {
  const t = useTranslations('StudentCourses.discussion');

  return (
    <DiscussionSection
      type={DiscussionType.MODULE}
      entityId={courseId}
      courseId={courseId}
      moduleId={moduleId}
      canDeleteAny={canDeleteAny}
      title={t('defaultTitle')}
    />
  );
}
