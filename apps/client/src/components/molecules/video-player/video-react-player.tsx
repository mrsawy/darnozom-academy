import React, { Ref } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, Gauge } from 'lucide-react';
import { useTranslations } from 'next-intl';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface VideoReactPlayerProps {
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
  playerRef: Ref<React.ComponentRef<typeof ReactPlayer>> | undefined;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  muted: boolean;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  playbackRate: number;
  setPlaybackRate: React.Dispatch<React.SetStateAction<number>>;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  showSpeedMenu: boolean;
  setShowSpeedMenu: React.Dispatch<React.SetStateAction<boolean>>;
  handleTimeChange: (state: { played: number; playedSeconds: number }) => void;
  handleDuration: (duration: number) => void;
  handleReady: () => void;
  handleSeekMouseDown: () => void;
  handleSeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSeekMouseUp: () => void;
  handlePlayPause: () => void;
  handleVolumeToggle: () => void;
  handleSpeedChange: (speed: number) => void;
  handleFullscreen: () => void;
  formatTime: (seconds: number) => string;
}

function VideoReactPlayer({
  url,
  toggleComplete: _toggleComplete,
  played,
  setPlayed: _setPlayed,
  watched: _watched,
  setWatched: _setWatched,
  isUploadedVideo: _isUploadedVideo,
  playerRef,
  playing,
  setPlaying: _setPlaying,
  volume,
  setVolume,
  muted,
  setMuted,
  playbackRate,
  setPlaybackRate: _setPlaybackRate,
  duration,
  setDuration: _setDuration,
  showSpeedMenu,
  setShowSpeedMenu,
  handleTimeChange,
  handleDuration,
  handleReady,
  handleSeekMouseDown,
  handleSeekChange,
  handleSeekMouseUp,
  handlePlayPause,
  handleVolumeToggle,
  handleSpeedChange,
  handleFullscreen,
  formatTime,
}: VideoReactPlayerProps) {
  const t = useTranslations('VideoPlayer');
  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-gray-100">
        <div className="text-center text-gray-500">
          <Play className="mx-auto mb-4 h-16 w-16 opacity-50" />
          <p>{t('noVideoUrl')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        playing={playing}
        volume={volume}
        muted={muted}
        // @ts-expect-error - react-player onProgress type is incorrect, it accepts { played, playedSeconds }
        onProgress={handleTimeChange}
        playbackRate={playbackRate}
        onDuration={handleDuration}
        onReady={handleReady}
        controls={false}
      />

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
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(played || 0) * 100}%, #4b5563 ${(played || 0) * 100}%, #4b5563 100%)`,
          }}
          className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-lg"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayPause}
              className="text-white transition-colors hover:text-blue-400">
              {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>

            <button
              type="button"
              onClick={handleVolumeToggle}
              className="text-white transition-colors hover:text-blue-400">
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(muted ? 0 : volume) * 100}%, #4b5563 ${(muted ? 0 : volume) * 100}%, #4b5563 100%)`,
              }}
              className="h-1 w-20 cursor-pointer appearance-none rounded-lg"
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
                className="flex items-center gap-1 text-white transition-colors hover:text-blue-400">
                <Gauge className="h-5 w-5" />
                <span className="text-sm">{t('playbackRate', { rate: playbackRate })}</span>
              </button>

              {showSpeedMenu ? (
                <div className="absolute right-0 bottom-full mb-2 min-w-[80px] rounded-lg bg-gray-900 py-1 shadow-lg">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-800 ${speed === playbackRate ? 'text-blue-400' : 'text-white'}`}>
                      {t('playbackRate', { rate: speed })}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleFullscreen}
              className="text-white transition-colors hover:text-blue-400">
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default VideoReactPlayer;
