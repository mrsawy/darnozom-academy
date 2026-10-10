import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, Gauge } from 'lucide-react';
import { ReactEventHandler, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface VideoProps {
  url: string;
  toggleComplete: (args: {
    completed: boolean;
    withToast: boolean;
    withRefresh: boolean;
  }) => Promise<void>;
  played: number;
  setPlayed: React.Dispatch<React.SetStateAction<number>>;
  watched: boolean;
  setWatched: React.Dispatch<React.SetStateAction<boolean>>;
  isUploadedVideo: boolean;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const formatTime = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
};

const handleFullscreen = () => {
  const playerElement = document.querySelector('#video-player-wrapper');
  if (playerElement) {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void playerElement.requestFullscreen();
    }
  }
};

function Video({
  url,
  toggleComplete,
  played,
  setPlayed,
  watched,
  setWatched,
  isUploadedVideo,
}: VideoProps) {
  const t = useTranslations('VideoPlayer');
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  // Rabie Changes
  const playerRef = useRef<HTMLVideoElement>(null);
  // Rabie Changes
  const lastUpdateTime = useRef<number>(0);
  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleVolumeToggle = () => {
    setMuted(!muted);
  };

  // Rabie Changes
  const handleTimeChange = (_event: React.SyntheticEvent<HTMLVideoElement>) => {
    // const currentTime = event.target.currentTime;
    const now = Date.now();

    const playerElement = playerRef.current;
    if (!playerElement) return;

    if (!seeking && now - lastUpdateTime.current >= 1000) {
      lastUpdateTime.current = now;
      setPlayed(playerElement.currentTime / duration);
    }

    if (playerElement.currentTime / duration > 0.9 && !watched) {
      setWatched(true);
      void toggleComplete({ completed: true, withRefresh: false, withToast: true });
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(Number.parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    const seekValue = Number.parseFloat((e.target as HTMLInputElement).value);
    if (playerRef.current) {
      const videoElement = playerRef.current;
      if (videoElement.duration) {
        videoElement.currentTime = seekValue * videoElement.duration;
      }
    }
  };

  const handleDuration: ReactEventHandler<HTMLVideoElement> = (event) => {
    const duration = (event.target as HTMLVideoElement).duration;
    setDuration(duration);
  };

  const handleReady = () => {
    setLoading(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  return (
    <div
      dir="ltr"
      id="video-player-wrapper"
      className="group relative mb-6 aspect-video overflow-hidden rounded-lg bg-black">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Loader2 className="text-primary h-12 w-12 animate-spin" />
        </div>
      ) : null}

      {isUploadedVideo ? (
        <ReactPlayer
          onDoubleClick={handleFullscreen}
          onClick={handlePlayPause}
          ref={playerRef}
          src={url}
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          muted={muted}
          onTimeUpdate={handleTimeChange}
          playbackRate={playbackRate}
          onDurationChange={handleDuration}
          onReady={handleReady}
          controls={false}
        />
      ) : (
        <ReactPlayer
          ref={playerRef}
          onDoubleClick={handleFullscreen}
          src="https://youtu.be/JJO44yATass?si=4dEP3tjgBMdibU59"
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          muted={muted}
          onTimeUpdate={handleTimeChange}
          playbackRate={playbackRate}
          // onProgress={handleProgress}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onDurationChange={handleDuration}
          onReady={handleReady}
          controls={false}
          onClick={handlePlayPause}
        />
      )}

      <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
        <input
          type="range"
          min={0}
          max={0.999_999}
          step="any"
          value={played || 0}
          onMouseDown={handleSeekMouseDown}
          onChange={handleSeekChange}
          onMouseUp={handleSeekMouseUp}
          style={{
            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(played || 0) * 100}%, #4b5563 ${(played || 0) * 100}%, #4b5563 100%)`,
          }}
          className="accent-primary [&::-webkit-slider-thumb]:bg-primary mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayPause}
              className="hover:text-primary text-white transition-colors">
              {playing ? (
                <Pause className="text-primary h-6 w-6" />
              ) : (
                <Play className="text-primary h-6 w-6" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleVolumeToggle()}
              className="hover:text-primary text-white transition-colors">
              {muted ? (
                <VolumeX className="text-primary h-5 w-5" />
              ) : (
                <Volume2 className="text-primary h-5 w-5" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number.parseFloat(e.target.value));
                setMuted(false);
              }}
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(muted ? 0 : volume) * 100}%, #4b5563 ${(muted ? 0 : volume) * 100}%, #4b5563 100%)`,
              }}
              className="accent-primary [&::-webkit-slider-thumb]:bg-primary h-1.5 w-20 cursor-pointer appearance-none rounded-lg bg-gray-700 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
            />

            <span className="text-sm text-white">
              {formatTime(duration * played)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Control */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="hover:text-primary flex items-center gap-1 text-white transition-colors">
                <Gauge className="text-primary h-5 w-5" />
                <span className="text-sm">{t('playbackRate', { rate: playbackRate })}</span>
              </button>

              {showSpeedMenu ? (
                <div className="absolute right-0 bottom-full mb-2 min-w-[80px] rounded-lg bg-gray-900 py-1 shadow-lg">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      type="button"
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-800 ${speed === playbackRate ? 'text-primary' : 'text-white'}`}>
                      {t('playbackRate', { rate: speed })}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleFullscreen}
              className="hover:text-primary text-white transition-colors">
              <Maximize className="text-primary h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Video;
