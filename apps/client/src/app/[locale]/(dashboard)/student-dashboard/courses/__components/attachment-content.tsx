'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import FileViewer from '@/components/molecules/file-viewer/fileViewer';
import { IContent } from '@/lib/types/course/content.interface';
import { ExternalLink, FileText } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToggleContentComplete } from '@/lib/hooks/course/content/useContent';
import { useParams } from 'next/navigation';

interface AttachmentContentProps {
  content: IContent;
  isComplete?: boolean;
}

export default function AttachmentContent({ content, isComplete = false }: AttachmentContentProps) {
  const t = useTranslations('StudentCourses.attachmentContent');
  const { mutate: toggleComplete } = useToggleContentComplete();
  const params = useParams();
  const enrollmentId = params.id as string;
  // Auto-mark as completed when user opens and sees the attachment content
  useEffect(() => {
    if (toggleComplete && !isComplete) {
      void toggleComplete({
        completed: true,
        withToast: false,
        withRefresh: false,
        enrollmentId,
        contentId: content._id,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount only

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.description ? (
            <p className="text-muted-foreground">{content.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {content.mimeType ? <Badge variant="outline">{content.mimeType}</Badge> : null}
            {content.fileSizeBytes ? (
              <Badge variant="outline">{Math.round(content.fileSizeBytes / 1024)} KB</Badge>
            ) : null}
          </div>
          {content.fileUrl ? (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <a
                    href={content.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="justify-self-end">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('viewAttachment')}
                  </a>
                </Button>
              </div>
              <FileViewer
                url={content.fileUrl}
                mimeType={content.mimeType}
                fileName={content.title}
                previewLabel={t('preview')}
                previewNotAvailableLabel={t('previewNotAvailable')}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t('attachmentUnavailable')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
