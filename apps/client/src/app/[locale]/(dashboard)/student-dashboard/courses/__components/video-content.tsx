import { useCallback, useRef } from 'react';
import { Play } from 'lucide-react';
import { VideoType } from '@/lib/types/course/enum/VideoType.enum';
import { IContent } from '@/lib/types/course/content.interface';
import VideoDice from '@/components/molecules/video-player/Video-dice';
import { useTranslations } from 'next-intl';
import ReactYoutubePlayer from '@/components/molecules/video-player/react-youtube-player';
import type { IContentProgressItem } from '@/lib/types/enrollment/enrollment.interface';
import { useToggleContentComplete } from '@/lib/hooks/course/content/useContent';
import { useParams } from 'next/navigation';
import { ProgressTrack } from '@darnozom/shared-types';

/** Fraction (0-1) of a video that must be watched before it is auto-marked complete. Mirrors mobile's threshold. */
const VIDEO_COMPLETION_FRACTION = ProgressTrack.VIDEO_COMPLETION_PERCENT / 100;

interface VideoContentProps {
  content: IContent;
  isComplete: boolean;
  contentProgressItem?: IContentProgressItem;
  onSaveVideoProgress?: (positionSeconds: number) => void;
}

export default function VideoContent({
  isComplete,
  content,
  contentProgressItem,
  onSaveVideoProgress,
}: VideoContentProps) {
  const t = useTranslations('StudentCourses.videoContent');
  const params = useParams();
  const enrollmentId = params.id as string;
  const url = content?.videoUrl ?? '';
  const isUploadedVideo = content.videoType === VideoType.UPLOAD;
  const initialPositionSeconds = contentProgressItem?.videoLastPositionSeconds ?? 0;

  const lastSaveTimeRef = useRef(0);
  const SAVE_VIDEO_PROGRESS_INTERVAL_MS = 15_000;

  const { mutate: toggleComplete } = useToggleContentComplete();

  const handlePercentageUpdate = useCallback(
    (percentage: number, positionSeconds?: number) => {
      if (positionSeconds !== undefined && onSaveVideoProgress) {
        const now = Date.now();
        if (now - lastSaveTimeRef.current >= SAVE_VIDEO_PROGRESS_INTERVAL_MS) {
          lastSaveTimeRef.current = now;
          onSaveVideoProgress(Math.floor(positionSeconds));
        }
      }
      if (percentage >= VIDEO_COMPLETION_FRACTION && !isComplete) {
        void toggleComplete({
          completed: true,
          withToast: false,
          withRefresh: false,
          enrollmentId,
          contentId: content._id,
        });
      }
    },
    [toggleComplete, onSaveVideoProgress, isComplete, enrollmentId, content._id]
  );

  if (!url) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex aspect-video items-center justify-center rounded-lg bg-gray-100">
          <div className="text-center text-gray-500">
            <Play className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <p>{t('noVideoUrl')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div
        id="video-player-wrapper"
        className="group dir-ltr relative mb-6 aspect-video overflow-hidden rounded-lg bg-black">
        {isUploadedVideo && url ? (
          <VideoDice
            url={url}
            onPlayedPercentageUpdate={handlePercentageUpdate}
            initialPositionSeconds={initialPositionSeconds}
          />
        ) : null}
        {url && !isUploadedVideo ? (
          <ReactYoutubePlayer
            url={url}
            onPlayedPercentageUpdate={handlePercentageUpdate}
            initialPositionSeconds={initialPositionSeconds}
          />
        ) : null}
      </div>

      <div className="space-y-4 text-center">
        {content.title ? <h3 className="text-xl font-semibold">{content.title}</h3> : null}

        {/* <div className="flex items-center justify-center gap-2">
          <div className="text-sm text-gray-600">
            {t('progress')} {Math.round(playedPercentage * 100)}%
          </div>
          {hasCompletedRef.current ? <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">{t('watched')}</span> : null}
        </div>

        <Button size="lg" disabled={hasCompletedRef.current} className={hasCompletedRef.current ? 'bg-green-600 hover:bg-green-600' : ''}>
          {hasCompletedRef.current ? t('watched') : t('completeToMark')}
        </Button> */}
      </div>
    </div>
  );
}
