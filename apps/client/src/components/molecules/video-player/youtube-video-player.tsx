import React, { ReactEventHandler, Ref, useCallback, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, Gauge, Loader2 } from 'lucide-react';
import { formatTime } from '@/lib/utils/video';
import { useTranslations } from 'next-intl';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface YoutubeVideoPlayerProps {
  url: string;
  onPlayedPercentageUpdate?: (time: number) => void;
}

interface ReactPlayerInstance {
  getInternalPlayer?: () => {
    setPlaybackRate?: (rate: number) => void;
    seekTo?: (time: number, allowSeekAhead: boolean) => void;
    playbackRate?: number;
  };
  seekTo?: (time: number, type: 'seconds' | 'fraction') => void;
  playbackRate?: number;
}

interface YouTubeApi {
  getAvailablePlaybackRates?: () => number[];
  getPlayerState?: () => number;
  setPlaybackRate?: (rate: number) => void;
  getPlaybackRate?: () => number;
}

interface YouTubeVideoElement extends HTMLElement {
  api?: YouTubeApi;
  playbackRate?: number;
  currentTime?: number;
  shadowRoot: ShadowRoot | null;
}

function YoutubeVideoPlayer({ onPlayedPercentageUpdate, url }: YoutubeVideoPlayerProps) {
  const t = useTranslations('VideoPlayer');
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [playedPercentage, setPlayedPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const playerRef = useRef<ReactPlayerInstance | null>(null);
  const reactPlayerInstanceRef = useRef<ReactPlayerInstance | null>(null);

  // Sync playbackRate changes to the player
  useEffect(() => {
    if (playbackRate) {
      // Find the youtube-video custom element
      const youtubeVideoElement = document.querySelector('youtube-video');

      if (youtubeVideoElement && 'playbackRate' in youtubeVideoElement) {
        try {
          youtubeVideoElement.playbackRate = playbackRate;
          return;
        } catch {
          // Silent fail
        }
      }

      // Try ReactPlayer instance
      if (reactPlayerInstanceRef.current) {
        const player = reactPlayerInstanceRef.current;

        if (typeof player.getInternalPlayer === 'function') {
          try {
            const internalPlayer = player.getInternalPlayer();
            if (internalPlayer && typeof internalPlayer.setPlaybackRate === 'function') {
              internalPlayer.setPlaybackRate(playbackRate);
              return;
            }
          } catch {
            // Silent fail
          }
        }

        if ('playbackRate' in player) {
          try {
            player.playbackRate = playbackRate;
          } catch {
            // Silent fail
          }
        }
      }

      // Try the ref
      if (playerRef.current && 'playbackRate' in playerRef.current) {
        try {
          playerRef.current.playbackRate = playbackRate;
        } catch {
          // Silent fail
        }
      }
    }
  }, [playbackRate]);

  const handleProgress: React.ReactEventHandler<HTMLVideoElement> = useCallback(
    (event) => {
      const currentTime = event.currentTarget.currentTime;
      const duration = event.currentTarget.duration;
      const percentage = currentTime / duration;
      if (duration > 0 && !seeking) {
        setPlayedPercentage(percentage);
        onPlayedPercentageUpdate?.(percentage);
      }
    },
    [seeking, onPlayedPercentageUpdate]
  );

  const handleReady = () => {
    setLoading(false);
  };

  const handlePlayPause = () => {
    setPlaying(!playing);
  };
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);

    const youtubeVideoElement = document.querySelector(
      'youtube-video'
    ) as YouTubeVideoElement | null;

    if (youtubeVideoElement?.api) {
      const api = youtubeVideoElement.api;

      // Check available playback rates first
      if (typeof api.getAvailablePlaybackRates === 'function') {
        try {
          const availableRates = api.getAvailablePlaybackRates();

          // YouTube might only support specific rates, round to nearest available
          if (Array.isArray(availableRates) && availableRates.length > 0) {
            // Find closest available rate
            let closestRate = availableRates[0];
            for (const rate of availableRates) {
              if (Math.abs(rate - speed) < Math.abs(closestRate - speed)) {
                closestRate = rate;
              }
            }
            speed = closestRate;
          }
        } catch {
          // Silent fail
        }
      }

      // Ensure video is playing before setting playback rate
      if (typeof api.getPlayerState === 'function') {
        api.getPlayerState();
        // State 1 = playing, 2 = paused, 3 = buffering
        // If paused, we might need to play first or set rate differently
      }

      // Try setPlaybackRate with a delay to ensure player is ready
      if (typeof api.setPlaybackRate === 'function') {
        setTimeout(() => {
          try {
            api.setPlaybackRate?.(speed);
            const currentRate =
              typeof api.getPlaybackRate === 'function' ? api.getPlaybackRate() : undefined;
            // Wait a bit and verify
            setTimeout(() => {
              if (currentRate !== speed) {
                api.setPlaybackRate?.(speed);
                if (playerRef.current && 'api' in playerRef.current) {
                  const playerApi = (playerRef.current as { api?: YouTubeApi }).api;
                  playerApi?.setPlaybackRate?.(speed);
                }
              }
            }, 200);
          } catch {
            // Silent fail
          }
        }, 50);
      }

      // Also try postMessage as backup
      try {
        const iframe =
          youtubeVideoElement.querySelector('iframe') ??
          youtubeVideoElement.shadowRoot?.querySelector('iframe');

        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setPlaybackRate',
              args: [speed],
            }),
            '*'
          );
        }
      } catch {
        // Silent fail
      }
    }
  };
  const handleVolumeToggle = () => {
    setMuted(!muted);
  };

  const handleDuration: ReactEventHandler<HTMLVideoElement> = (event) => {
    const duration = (event.target as HTMLVideoElement).duration;
    setDuration(duration);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    const seekValue = Number.parseFloat((e.target as HTMLInputElement).value);

    if (duration > 0) {
      const seekTime = seekValue * duration; // Convert percentage to seconds

      // Try ReactPlayer instance first (captured via callback ref)
      if (reactPlayerInstanceRef.current) {
        const player = reactPlayerInstanceRef.current;
        if (typeof player.seekTo === 'function') {
          try {
            player.seekTo(seekTime, 'seconds');
            return;
          } catch {
            // Silent fail
          }
        }
      }

      // Fallback: Try the ref (might be custom element)
      if (playerRef.current) {
        const player = playerRef.current;

        // Try ReactPlayer's seekTo
        if (typeof player.seekTo === 'function') {
          try {
            player.seekTo(seekTime, 'seconds');
            return;
          } catch {
            // Silent fail
          }
        }

        // Try getInternalPlayer
        if (typeof player.getInternalPlayer === 'function') {
          try {
            const internalPlayer = player.getInternalPlayer();
            if (internalPlayer && typeof internalPlayer.seekTo === 'function') {
              internalPlayer.seekTo(seekTime, true);
              return;
            }
          } catch {
            // Silent fail
          }
        }

        // Try custom element's currentTime
        const playerWithCurrentTime = player as YouTubeVideoElement;
        if ('currentTime' in playerWithCurrentTime) {
          try {
            playerWithCurrentTime.currentTime = seekTime;
            return;
          } catch {
            // Silent fail
          }
        }
      }
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayedPercentage(Number.parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleFullscreen = useCallback(() => {
    const playerElement = document.querySelector('#video-player-wrapper');
    if (playerElement) {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void playerElement.requestFullscreen();
      }
    }
  }, []);

  return (
    <div className="group relative mb-6 aspect-video overflow-hidden rounded-lg bg-black">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      ) : null}

      <ReactPlayer
        ref={playerRef as Ref<HTMLVideoElement> | undefined}
        src={url}
        width="100%"
        height="100%"
        playing={playing}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        onDurationChange={handleDuration}
        onReady={handleReady}
        controls={false}
        onTimeUpdate={handleProgress}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
        <input
          type="range"
          min={0}
          max={0.999_999}
          step="any"
          value={playedPercentage ?? 0}
          onMouseDown={handleSeekMouseDown}
          onChange={handleSeekChange}
          onMouseUp={handleSeekMouseUp}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(playedPercentage ?? 0) * 100}%, #4b5563 ${(playedPercentage ?? 0) * 100}%, #4b5563 100%)`,
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
              {formatTime(duration * playedPercentage)} / {formatTime(duration)}
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
    </div>
  );
}

export default YoutubeVideoPlayer;
