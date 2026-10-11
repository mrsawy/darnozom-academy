'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Badge } from '@/components/atoms/badge';
import { useTranslations } from 'next-intl';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';
import { PublishStatus } from '@darnozom/shared-types';
import { getContentTypeColor } from './content-type-helpers';
import { useSetContentPublishStatus } from '@/lib/hooks/course/usePublishStatus';
import { PublishToggle } from '@/components/molecules/publish-toggle';
import type { ApprovalStatusType as ApprovalStatus } from '@darnozom/shared-types';

interface ContentStatusCardProps {
  contentType: CourseContentType;
  contentId?: string;
  publishStatus?: PublishStatus;
  approvalStatus?: ApprovalStatus;
}

export default function ContentStatusCard({
  contentType,
  contentId,
  publishStatus,
  approvalStatus,
}: ContentStatusCardProps) {
  const t = useTranslations('CreateContentForm');
  const tPublish = useTranslations('PublishStatus');
  const { mutate: setPublish, isPending } = useSetContentPublishStatus();

  const isPublished = publishStatus === PublishStatus.PUBLISHED;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('contentStatus.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('contentStatus.type')}</span>
          <Badge className={getContentTypeColor(contentType)}>
            {t(`contentTypes.${contentType}`) || contentType}
          </Badge>
        </div>
        {contentId ? (
          <div className="flex items-center justify-between">
            <span className="text-sm">{tPublish(isPublished ? 'published' : 'draft')}</span>
            <PublishToggle
              publishStatus={publishStatus}
              approvalStatus={approvalStatus}
              isPending={isPending}
              onToggle={(status) => setPublish({ contentId, publishStatus: status })}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
