import { Card, CardContent } from '@/components/atoms/card';
import { IContent } from '@/lib/types/course/content.interface';
import { useEffect } from 'react';
import { ProgressTrack } from '@lms-organization/shared-types';
import { useToggleContentComplete } from '@/lib/hooks/course/content/useContent';
import { useParams } from 'next/navigation';

interface ArticleContentProps {
  content: IContent;
  isComplete: boolean;
}

export default function ArticleContent({ isComplete, content }: ArticleContentProps) {
  const { mutate: toggleComplete } = useToggleContentComplete();
  const params = useParams();
  const enrollmentId = params.id as string;
  useEffect(() => {
    const setAsComplete = setTimeout(() => {
      if (!isComplete) {
        void toggleComplete({
          completed: true,
          withToast: false,
          withRefresh: false,
          enrollmentId,
          contentId: content._id,
        });
      }
    }, ProgressTrack.ARTICLE_TIME_TO_COMPLETE);
    return () => {
      clearTimeout(setAsComplete);
    };
  }, [isComplete, toggleComplete, content._id, enrollmentId]);

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="prose max-w-none">
            <div className="text-lg leading-relaxed">{content.body ?? ''}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
