import {
  MediaPlayer,
  MediaPlayerControls,
  MediaPlayerControlsOverlay,
  MediaPlayerFullscreen,
  MediaPlayerPiP,
  MediaPlayerPlay,
  MediaPlayerPlaybackSpeed,
  MediaPlayerSeek,
  MediaPlayerSeekBackward,
  MediaPlayerSeekForward,
  MediaPlayerTime,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from '@/components/atoms/media-player';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VideoProps {
  url: string;
  onPlayedPercentageUpdate?: (percentage: number, positionSeconds?: number) => void;
  initialPositionSeconds?: number;
  withoutControls?: boolean;
}

export default function Video({
  url,
  onPlayedPercentageUpdate,
  initialPositionSeconds = 0,
  withoutControls = false,
}: VideoProps) {
  const isMobile = useIsMobile();

  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialSeekDoneRef = useRef(false);
  const playerRef = useRef<HTMLVideoElement | null>(null);

  const handleFullscreen = async () => {
    const playerElement = document.querySelector('#video-player-wrapper');
    if (playerElement) {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsVideoFullscreen(false);
      } else {
        await playerElement.requestFullscreen();
        setIsVideoFullscreen(true);
      }
    }
  };

  const handleReady = () => {
    setLoading(false);
    if (initialPositionSeconds > 0 && playerRef.current && !initialSeekDoneRef.current) {
      try {
        playerRef.current.currentTime = initialPositionSeconds;
        initialSeekDoneRef.current = true;
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (initialPositionSeconds <= 0) initialSeekDoneRef.current = true;
  }, [initialPositionSeconds]);

  const handleTimeUpdate = async (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const currentVideoTime = video.currentTime;
    const videoDuration = video.duration;

    if (videoDuration > 0) {
      const progress = currentVideoTime / videoDuration;
      onPlayedPercentageUpdate?.(progress, currentVideoTime);
    }
  };

  return (
    <MediaPlayer
      dir="ltr"
      className={`@container ${!isVideoFullscreen && 'group relative mb-6 aspect-video overflow-hidden rounded-2xl bg-black'}`}
      id="video-player-wrapper"
      autoHide>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Loader2 className="text-primary h-8 w-8 animate-spin @[200px]:h-12 @[200px]:w-12" />
        </div>
      ) : null}
      <MediaPlayerVideo
        className="outline-none"
        width="100%"
        height="100%"
        ref={playerRef}
        onTimeUpdate={(e) => void handleTimeUpdate(e)}
        onLoadedMetadata={handleReady}
        onCanPlay={handleReady}
        onDoubleClick={() => void handleFullscreen()}
        autoPlay>
        <source src={url} type="video/mp4" />
      </MediaPlayerVideo>
      {withoutControls ? null : (
        <MediaPlayerControls className="flex-col items-start gap-1.5 px-2 py-2 @[320px]:gap-2.5 @[320px]:px-4 @[320px]:py-3">
          <MediaPlayerControlsOverlay />
          <MediaPlayerSeek />
          <div className="flex w-full items-center gap-1 @[320px]:gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 @[320px]:gap-2">
              <MediaPlayerPlay className="shrink-0 rounded-full! bg-none text-white! hover:bg-white/10" />
              {isMobile ? null : (
                <>
                  <MediaPlayerSeekBackward className="rounded-full! bg-none text-white! hover:bg-white/10" />
                  <MediaPlayerSeekForward className="rounded-full! bg-none text-white! hover:bg-white/10" />
                </>
              )}
              <MediaPlayerVolume
                expandable
                className="shrink-0 rounded-full! bg-none text-white! hover:bg-white/10"
              />
              <MediaPlayerTime className="select-none @max-[320px]:hidden" />
            </div>
            <div className="flex shrink-0 items-center gap-1 @[320px]:gap-2">
              <MediaPlayerPlaybackSpeed className="rounded-full! bg-none text-white! hover:bg-white/10 @max-[400px]:hidden" />
              <MediaPlayerPiP className="rounded-full! bg-none text-white! hover:bg-white/10 @max-[280px]:hidden" />
              <MediaPlayerFullscreen className="rounded-full! bg-none text-white! hover:bg-white/10" />
            </div>
          </div>
        </MediaPlayerControls>
      )}
    </MediaPlayer>
  );
}
