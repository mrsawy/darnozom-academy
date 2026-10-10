'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';

interface ContentTipsCardProps {
  contentType: CourseContentType;
}

export default function ContentTipsCard({ contentType }: ContentTipsCardProps) {
  const t = useTranslations('CreateContentForm');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
          {t('contentTips.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {contentType === CourseContentType.ARTICLE && (
            <>
              <li>• {t('contentTips.article.tip1')}</li>
              <li>• {t('contentTips.article.tip2')}</li>
              <li>• {t('contentTips.article.tip3')}</li>
            </>
          )}
          {contentType === CourseContentType.VIDEO && (
            <>
              <li>• {t('contentTips.video.tip1')}</li>
              <li>• {t('contentTips.video.tip2')}</li>
              <li>• {t('contentTips.video.tip3')}</li>
            </>
          )}
          {contentType === CourseContentType.QUIZ && (
            <>
              <li>• {t('contentTips.quiz.tip1')}</li>
              <li>• {t('contentTips.quiz.tip2')}</li>
              <li>• {t('contentTips.quiz.tip3')}</li>
            </>
          )}
          {contentType === CourseContentType.ASSIGNMENT && (
            <>
              <li>• {t('contentTips.assignment.tip1')}</li>
              <li>• {t('contentTips.assignment.tip2')}</li>
              <li>• {t('contentTips.assignment.tip3')}</li>
            </>
          )}
          {contentType === CourseContentType.LIVE_SESSION && (
            <>
              <li>• {t('contentTips.liveSession.tip1')}</li>
              <li>• {t('contentTips.liveSession.tip2')}</li>
              <li>• {t('contentTips.liveSession.tip3')}</li>
            </>
          )}
          {contentType === CourseContentType.ATTACHMENT && (
            <>
              <li>• {t('contentTips.attachment.tip1')}</li>
              <li>• {t('contentTips.attachment.tip2')}</li>
              <li>• {t('contentTips.attachment.tip3')}</li>
            </>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
