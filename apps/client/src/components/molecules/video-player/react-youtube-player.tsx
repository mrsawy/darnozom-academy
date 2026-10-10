import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Play, Pause, Volume2, VolumeX, Maximize, Gauge, Loader2 } from 'lucide-react';
import { formatTime } from '@/lib/utils/video';
import { useTranslations } from 'next-intl';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface ReactYoutubePlayerProps {
  url: string;
  onPlayedPercentageUpdate?: (percentage: number, positionSeconds?: number) => void;
  initialPositionSeconds?: number;
}

// YouTube Player API interface
interface YouTubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  setPlaybackRate: (rate: number) => void;
  getAvailablePlaybackRates: () => number[];
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

// Helper function to find closest playback rate
function findClosestRate(availableRates: number[], targetRate: number): number {
  let closest = availableRates[0];
  let minDiff = Math.abs(availableRates[0] - targetRate);

  for (let i = 1; i < availableRates.length; i++) {
    const diff = Math.abs(availableRates[i] - targetRate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = availableRates[i];
    }
  }

  return closest;
}

// Handle fullscreen functionality
function handleFullscreen(): void {
  const playerElement = document.querySelector('#video-player-wrapper');
  if (playerElement) {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Silent fail
      });
    } else {
      void playerElement.requestFullscreen().catch(() => {
        // Silent fail
      });
    }
  }
}

function ReactYoutubePlayer({
  url,
  onPlayedPercentageUpdate,
  initialPositionSeconds = 0,
}: ReactYoutubePlayerProps) {
  const t = useTranslations('VideoPlayer');
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playedPercentage, setPlayedPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const videoId = getYouTubeVideoId(url);

  // Update current time periodically and track progress
  useEffect(() => {
    if (isReady && playerRef.current) {
      const updateTime = () => {
        if (playerRef.current && !seeking) {
          try {
            const time = playerRef.current.getCurrentTime();
            if (typeof time === 'number' && !Number.isNaN(time) && time >= 0) {
              setCurrentTime(time);

              // Calculate and update played percentage
              if (duration > 0) {
                const percentage = time / duration;
                setPlayedPercentage(percentage);
                onPlayedPercentageUpdate?.(percentage, time);
              }
            }
          } catch {
            // Silent fail
          }
        }
      };

      // Update immediately
      updateTime();

      // Then update periodically
      intervalRef.current = setInterval(updateTime, 250);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isReady, seeking, duration, onPlayedPercentageUpdate]);

  const handleReady: YouTubeProps['onReady'] = (event: YouTubeEvent<number>) => {
    playerRef.current = event.target as unknown as YouTubePlayer;
    setIsReady(true);
    setLoading(false);

    if (initialPositionSeconds > 0) {
      try {
        playerRef.current?.seekTo(initialPositionSeconds, true);
      } catch {
        // ignore
      }
    }

    // Get initial duration - might need to wait a bit
    const getDuration = () => {
      try {
        const dur = playerRef.current?.getDuration();
        if (dur && dur > 0) {
          setDuration(dur);
        } else {
          // Retry after a short delay if duration not available yet
          setTimeout(getDuration, 500);
        }
      } catch {
        // Retry after a short delay
        setTimeout(getDuration, 500);
      }
    };
    getDuration();

    // Set initial volume (convert from 0-1 to 0-100 for YouTube API)
    try {
      playerRef.current?.setVolume(volume * 100);
      if (muted) {
        playerRef.current?.mute();
      }
    } catch {
      // Silent fail
    }
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event: YouTubeEvent<number>) => {
    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    const state = event.data;
    switch (state) {
      case 1: {
        setPlaying(true);
        setLoading(false);

        break;
      }
      case 2:
      case 0: {
        setPlaying(false);
        setLoading(false);

        break;
      }
      case 3: {
        // Only show loading if we're actually buffering during playback
        if (isReady) {
          setLoading(true);
        }

        break;
      }
      case -1:
      case 5: {
        setLoading(false);

        break;
      }
      // No default
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;

    try {
      if (playing) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch {
      // Silent fail
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);

    if (!playerRef.current || !isReady) return;

    // YouTube requires video to be playing or at least loaded to change playback rate
    const applyPlaybackRate = () => {
      try {
        // Get available playback rates
        const availableRates = playerRef.current?.getAvailablePlaybackRates();

        if (Array.isArray(availableRates) && availableRates.length > 0) {
          // Find closest available rate
          const closestRate = findClosestRate(availableRates, speed);
          playerRef.current?.setPlaybackRate(closestRate);
          setPlaybackRate(closestRate);
        } else {
          playerRef.current?.setPlaybackRate(speed);
        }
      } catch {
        // Retry after a short delay
        setTimeout(applyPlaybackRate, 100);
      }
    };

    // If video is not playing, we might need to ensure it's ready
    const playerState = playerRef.current.getPlayerState();
    if (playerState === -1 || playerState === 5) {
      // Video not started yet, wait for it to be ready
      setTimeout(applyPlaybackRate, 200);
    } else {
      applyPlaybackRate();
    }
  };

  const handleVolumeToggle = () => {
    if (!playerRef.current) return;

    try {
      if (muted) {
        playerRef.current.unMute();
        setMuted(false);
      } else {
        playerRef.current.mute();
        setMuted(true);
      }
    } catch {
      // Silent fail
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value);
    setVolume(newVolume);

    // Automatically mute/unmute based on volume
    if (newVolume === 0) {
      setMuted(true);
    } else {
      setMuted(false);
    }

    if (!playerRef.current) return;

    try {
      // YouTube API expects 0-100, but we store 0-1
      playerRef.current.setVolume(newVolume * 100);
      if (newVolume === 0) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch {
      // Silent fail
    }
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = Number.parseFloat(e.target.value);
    setPlayedPercentage(percentage);
    if (duration > 0) {
      setCurrentTime(percentage * duration);
    }
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    const seekValue = Number.parseFloat((e.target as HTMLInputElement).value);

    if (duration > 0 && playerRef.current) {
      const seekTime = seekValue * duration;

      try {
        playerRef.current.seekTo(seekTime, true);
        // Update current time immediately
        setCurrentTime(seekTime);
      } catch {
        // Silent fail
      }
    }

    // Reset seeking state after a short delay to allow seek to complete
    setTimeout(() => {
      setSeeking(false);
    }, 100);
  };

  // Sync volume changes
  useEffect(() => {
    if (playerRef.current && !muted && isReady) {
      try {
        // YouTube API expects 0-100, but we store 0-1
        playerRef.current.setVolume(volume * 100);
      } catch {
        // Silent fail
      }
    }
  }, [volume, muted, isReady]);

  // Sync playback rate changes
  useEffect(() => {
    if (playerRef.current && playbackRate && isReady) {
      try {
        const availableRates = playerRef.current.getAvailablePlaybackRates();
        if (Array.isArray(availableRates) && availableRates.length > 0) {
          const closestRate = findClosestRate(availableRates, playbackRate);
          playerRef.current.setPlaybackRate(closestRate);
        } else {
          playerRef.current.setPlaybackRate(playbackRate);
        }
      } catch {
        // Silent fail
      }
    }
  }, [playbackRate, isReady]);

  if (!videoId) {
    return (
      <div className="relative mb-6 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black">
        <p className="text-white">{t('invalidYoutubeUrl')}</p>
      </div>
    );
  }

  const opts: {
    height: string;
    width: string;
    playerVars: {
      autoplay: number;
      controls: number;
      modestbranding: number;
      rel: number;
      showinfo: number;
    };
  } = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
    },
  };

  return (
    <div className="group relative mb-6 aspect-video overflow-hidden rounded-lg bg-black">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      ) : null}

      <div className="absolute inset-0">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="h-full w-full"
          iframeClassName="w-full h-full"
        />
      </div>

      <div className="absolute right-0 bottom-0 left-0 z-20 bg-linear-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
        <input
          type="range"
          min={0}
          max={0.999_999}
          step="any"
          value={playedPercentage || 0}
          onMouseDown={handleSeekMouseDown}
          onChange={handleSeekChange}
          onMouseUp={handleSeekMouseUp}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(playedPercentage || 0) * 100}%, #4b5563 ${(playedPercentage || 0) * 100}%, #4b5563 100%)`,
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
              {muted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(muted ? 0 : volume) * 100}%, #4b5563 ${(muted ? 0 : volume) * 100}%, #4b5563 100%)`,
              }}
              className="h-1 w-20 cursor-pointer appearance-none rounded-lg"
            />

            <span className="text-sm text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
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

export default ReactYoutubePlayer;
