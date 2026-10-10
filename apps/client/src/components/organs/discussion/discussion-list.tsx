'use client';

import { IDiscussionWithReplies, DiscussionType } from '@/lib/types/discussion/discussion.types';
import { DiscussionItem } from './discussion-item';
import { useTranslations } from 'next-intl';

interface DiscussionListProps {
  discussions: IDiscussionWithReplies[];
  currentUserId?: string;
  canDeleteAny?: boolean;
  onUpdate: () => void;
  type: DiscussionType;
  entityId: string;
  moduleId?: string;
  contentId?: string;
}

export function DiscussionList({
  discussions,
  currentUserId,
  canDeleteAny,
  onUpdate,
  type,
  entityId,
  moduleId,
  contentId,
}: DiscussionListProps) {
  const t = useTranslations('StudentCourses.discussion');

  if (discussions.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-lg font-medium">{t('noDiscussions')}</p>
        <p className="mt-1 text-sm">{t('beFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {discussions.map((discussion) => (
          <DiscussionItem
            key={discussion._id}
            discussion={discussion}
            currentUserId={currentUserId}
            canDeleteAny={canDeleteAny}
            onUpdate={onUpdate}
            type={type}
            entityId={entityId}
            moduleId={moduleId}
            contentId={contentId}
          />
        ))}
      </div>
    </div>
  );
}
