'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type AgoraRTC from 'agora-rtc-sdk-ng';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  UID,
  ScreenVideoTrackInitConfig,
  CameraVideoTrackInitConfig,
} from 'agora-rtc-sdk-ng';
import { cn } from '@/lib/utils';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
  AlertCircle,
  Share2,
  Monitor,
  Users,
  User,
  ChevronLeft,
  Wifi,
  WifiOff,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/atoms/button';
import type { AgoraCallConfig, AgoraCallStatus } from './agora-call.schema';

interface AgoraCallProps {
  config: AgoraCallConfig;
  onCallEnded?: () => void;
  onBack?: () => void;
  /** Called when the token is about to expire; must resolve to the new token string. */
  renewToken?: () => Promise<string>;
}

interface RemoteUserState {
  user: IAgoraRTCRemoteUser;
  hasVideo: boolean;
  hasAudio: boolean;
}

function toNumericUid(uid: UID): number {
  return typeof uid === 'number' ? uid : Number.parseInt(uid, 10);
}

function isBenignLeaveError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
  return msg.includes('WS_ABORT') || msg.includes('OPERATION_ABORTED') || code === 'WS_ABORT';
}

async function safeLeave(client: IAgoraRTCClient): Promise<void> {
  try {
    await client.leave();
  } catch (err) {
    if (!isBenignLeaveError(err)) {
      /* non-fatal leave failure */
    }
  }
}

const CAMERA_CONFIG: CameraVideoTrackInitConfig = {
  encoderConfig: '480p_1',
  optimizationMode: 'motion',
};

const CAMERA_FALLBACK_CONFIG: CameraVideoTrackInitConfig = {
  encoderConfig: '360p_1',
  optimizationMode: 'motion',
};

// ─── Control button ────────────────────────────────────────────────────────────

interface ControlButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className: string;
  disabled?: boolean;
}

function ControlButton({ onClick, icon, label, className, disabled }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-150 active:scale-95',
        disabled ? 'cursor-not-allowed bg-zinc-800 text-zinc-500 opacity-40' : className
      )}>
      {icon}
      <span className="text-[10px] leading-none font-semibold">{label}</span>
    </button>
  );
}

// ─── Avatar placeholder ────────────────────────────────────────────────────────

function AvatarPlaceholder({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: { outer: 'h-10 w-10', icon: 'h-5 w-5' },
    md: { outer: 'h-14 w-14', icon: 'h-7 w-7' },
    lg: { outer: 'h-20 w-20', icon: 'h-10 w-10' },
  };
  const { outer, icon } = sizeMap[size];
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-zinc-700 ring-4 ring-zinc-600',
        outer
      )}>
      <User className={cn('text-zinc-300', icon)} />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AgoraCall({ config, onCallEnded, onBack, renewToken }: AgoraCallProps) {
  const t = useTranslations('AgoraCall');
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [status, setStatus] = useState<AgoraCallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [remoteUserMap, setRemoteUserMap] = useState<Map<number, RemoteUserState>>(new Map());
  const [joinedWithoutVideo, setJoinedWithoutVideo] = useState(false);
  const [pinnedUid, setPinnedUid] = useState<number | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const inFlightClientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const mainRemoteRef = useRef<HTMLDivElement>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenShareTrackRef = useRef<IAgoraRTCRemoteUser | null>(null);
  const remoteVideoRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pendingSessionRef = useRef<Promise<void>>(Promise.resolve());
  const renewTokenRef = useRef(renewToken);
  useEffect(() => {
    renewTokenRef.current = renewToken;
  }, [renewToken]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const remoteEntries = useMemo(() => [...remoteUserMap.values()], [remoteUserMap]);

  const primaryEntry = useMemo(() => {
    if (pinnedUid) {
      const pinned = remoteUserMap.get(pinnedUid);
      if (pinned) return pinned;
    }
    return remoteEntries[0] ?? null;
  }, [pinnedUid, remoteUserMap, remoteEntries]);

  const sidebarEntries = useMemo(
    () =>
      remoteEntries.filter(
        (e) =>
          toNumericUid(e.user.uid) !== (primaryEntry ? toNumericUid(primaryEntry.user.uid) : -1)
      ),
    [remoteEntries, primaryEntry]
  );

  const totalParticipants = 1 + remoteEntries.length;
  const gridCols =
    totalParticipants <= 1
      ? 'grid-cols-1'
      : totalParticipants <= 4
        ? 'grid-cols-2'
        : totalParticipants <= 6
          ? 'grid-cols-3'
          : 'grid-cols-4';

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  const cleanup = useCallback(async (clientOverride?: IAgoraRTCClient | null) => {
    const client = clientOverride ?? clientRef.current ?? inFlightClientRef.current;
    const audioTrack = localAudioTrackRef.current;
    const videoTrack = localVideoTrackRef.current;
    const screenTrack = screenShareTrackRef.current;

    clientRef.current = null;
    inFlightClientRef.current = null;
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;
    screenShareTrackRef.current = null;

    if (client) {
      const published = [audioTrack, videoTrack, screenTrack].filter(
        (track): track is NonNullable<typeof track> => track != null
      );
      if (published.length > 0) {
        try {
          await client.unpublish(published as Parameters<typeof client.unpublish>[0]);
        } catch {
          /* channel may be disconnected */
        }
      }
    }

    audioTrack?.close();
    videoTrack?.close();
    (screenTrack as unknown as { close?: () => void })?.close?.();

    if (client) await safeLeave(client);
  }, []);

  const endCall = useCallback(async () => {
    await cleanup();
    setStatus('ended');
    onCallEnded?.();
  }, [cleanup, onCallEnded]);

  // ── Join effect ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function join() {
      await pendingSessionRef.current;
      if (!mounted) return;
      setStatus('joining');
      setJoinedWithoutVideo(false);
      setError(null);
      setRemoteUserMap(new Map());

      const AgoraRTCModule: typeof AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const client = AgoraRTCModule.createClient({ mode: 'rtc', codec: 'vp8' });
      inFlightClientRef.current = client;

      try {
        // ── Remote user event handlers ──────────────────────────────────────────

        client.on('user-published', (user, mediaType) => {
          void (async () => {
            await client.subscribe(user, mediaType);
            if (!mounted) return;
            const uid = toNumericUid(user.uid);
            setRemoteUserMap((prev) => {
              const m = new Map(prev);
              const e = m.get(uid);
              m.set(uid, {
                user,
                hasVideo: mediaType === 'video' ? true : (e?.hasVideo ?? false),
                hasAudio: mediaType === 'audio' ? true : (e?.hasAudio ?? false),
              });
              return m;
            });
            if (mediaType === 'audio') user.audioTrack?.play();
            if (mediaType === 'video') {
              const container = remoteVideoRefs.current.get(uid);
              if (container) user.videoTrack?.play(container);
            }
          })();
        });

        /**
         * user-unpublished fires when a remote user stops publishing a track
         * (e.g. mutes mic, turns off camera). The user is still in the call —
         * only update the hasVideo/hasAudio flags; never remove from the map.
         */
        client.on('user-unpublished', (user, mediaType) => {
          if (!mounted) return;
          const uid = toNumericUid(user.uid);
          setRemoteUserMap((prev) => {
            const m = new Map(prev);
            const e = m.get(uid);
            if (!e) return prev;
            m.set(uid, {
              ...e,
              hasVideo: mediaType === 'video' ? false : e.hasVideo,
              hasAudio: mediaType === 'audio' ? false : e.hasAudio,
            });
            return m;
          });
        });

        client.on('user-left', (user) => {
          if (!mounted) return;
          const uid = toNumericUid(user.uid);
          setRemoteUserMap((prev) => {
            const m = new Map(prev);
            m.delete(uid);
            return m;
          });
          setPinnedUid((prev) => (prev === uid ? null : prev));
        });

        client.on('connection-state-change', (curState) => {
          if (!mounted) return;
          if (curState === 'RECONNECTING') setStatus('reconnecting');
          if (curState === 'CONNECTED') setStatus('connected');
          if (curState === 'DISCONNECTED') setStatus('ended');
        });

        client.on('network-quality', (stats) => {
          if (!mounted) return;
          const q = stats.uplinkNetworkQuality;
          setNetworkQuality(q === 0 ? 'unknown' : q <= 2 ? 'good' : 'poor');
        });

        client.on('token-privilege-will-expire', () => {
          void (async () => {
            const fn = renewTokenRef.current;
            if (!fn) return;
            try {
              const newToken = await fn();
              await client.renewToken(newToken);
            } catch {
              /* will expire naturally */
            }
          })();
        });

        await client.join(config.appId, config.channelName, config.token, config.uid);

        if (!mounted) {
          await cleanup(client);
          return;
        }

        clientRef.current = client;
        inFlightClientRef.current = null;

        let audioTrack: IMicrophoneAudioTrack;
        let videoTrack: ICameraVideoTrack | null = null;

        try {
          const pair = await AgoraRTCModule.createMicrophoneAndCameraTracks(
            undefined,
            CAMERA_CONFIG
          );
          audioTrack = pair[0];
          videoTrack = pair[1];
        } catch {
          audioTrack = await AgoraRTCModule.createMicrophoneAudioTrack();
          try {
            videoTrack = await AgoraRTCModule.createCameraVideoTrack(CAMERA_FALLBACK_CONFIG);
          } catch {
            videoTrack = null;
          }
        }

        if (!mounted) {
          await cleanup(client);
          return;
        }

        localAudioTrackRef.current = audioTrack;
        localVideoTrackRef.current = videoTrack;

        if (videoTrack && localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        await client.publish(videoTrack ? [audioTrack, videoTrack] : [audioTrack]);

        if (!mounted) {
          await cleanup();
          return;
        }

        if (!videoTrack) {
          setJoinedWithoutVideo(true);
          setIsCamOn(false);
        }
        setStatus('connected');
      } catch (err: unknown) {
        await cleanup(client);
        const msg = err instanceof Error ? err.message : tRef.current('errors.joinFailed');
        if (mounted) {
          setError(msg);
          setStatus('error');
        }
      } finally {
        if (inFlightClientRef.current === client) inFlightClientRef.current = null;
      }
    }

    const joinPromise = join();

    return () => {
      mounted = false;
      pendingSessionRef.current = (async () => {
        try {
          await joinPromise;
        } catch {
          // Join may reject when unmounting before connect completes; cleanup still runs.
        }
        await cleanup();
      })();
    };
  }, [config.appId, config.channelName, config.token, config.uid, cleanup]);

  // ── Replay remote tracks when entries or view mode change ─────────────────────

  useEffect(() => {
    // Replay sidebar/grid remote tracks in their registered containers
    remoteEntries.forEach((entry) => {
      if (entry.hasVideo && entry.user.videoTrack) {
        const uid = toNumericUid(entry.user.uid);
        const container = remoteVideoRefs.current.get(uid);
        if (container) entry.user.videoTrack.play(container);
      }
    });
    // Replay primary remote into the main speaker area
    if (
      !isGridView &&
      primaryEntry?.hasVideo &&
      primaryEntry.user.videoTrack &&
      mainRemoteRef.current
    ) {
      primaryEntry.user.videoTrack.play(mainRemoteRef.current);
    }
  }, [remoteEntries, isGridView, primaryEntry]);

  // ── Replay local track when view mode changes (DOM element differs) ───────────

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeTrack =
        (screenShareTrackRef.current as unknown as { play?: (el: HTMLDivElement) => void }) ??
        localVideoTrackRef.current;
      if (activeTrack?.play && localVideoRef.current) {
        activeTrack.play(localVideoRef.current);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [isGridView]);

  // ── Controls ──────────────────────────────────────────────────────────────────

  const toggleMic = useCallback(async () => {
    try {
      if (!localAudioTrackRef.current) return;
      await localAudioTrackRef.current.setEnabled(!isMicOn);
      setIsMicOn((v) => !v);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mic toggle failed');
    }
  }, [isMicOn]);

  const toggleCam = useCallback(async () => {
    try {
      if (!localVideoTrackRef.current) return;
      await localVideoTrackRef.current.setEnabled(!isCamOn);
      setIsCamOn((v) => !v);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera toggle failed');
    }
  }, [isCamOn]);

  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current;
    const screenTrack = screenShareTrackRef.current as unknown as {
      close?: () => void;
      off?: (event: string, cb: unknown) => void;
    } | null;
    const videoTrack = localVideoTrackRef.current;

    screenShareTrackRef.current = null;

    if (screenTrack) {
      try {
        if (client) await client.unpublish(screenTrack as Parameters<typeof client.unpublish>[0]);
      } catch {
        /* connection may be lost */
      }
      screenTrack.close?.();
    }

    if (videoTrack && client) {
      try {
        await videoTrack.setEnabled(true);
        await client.publish(videoTrack);
        if (localVideoRef.current) videoTrack.play(localVideoRef.current);
      } catch {
        /* non-fatal */
      }
    }

    setIsScreenSharing(false);
    setError(null);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const client = clientRef.current;

    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    if (!client || status !== 'connected') {
      setError(t('errors.notConnected'));
      return;
    }

    try {
      const AgoraRTCModule: typeof AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const videoTrack = localVideoTrackRef.current;

      if (videoTrack) {
        try {
          await client.unpublish(videoTrack);
          await videoTrack.setEnabled(false);
        } catch {
          /* non-fatal */
        }
      }

      let screenTrack: Awaited<ReturnType<typeof AgoraRTCModule.createScreenVideoTrack>>;
      try {
        screenTrack = await AgoraRTCModule.createScreenVideoTrack(
          { encoderConfig: '720p_2' } as ScreenVideoTrackInitConfig,
          'disable'
        );
      } catch (err) {
        if (videoTrack && clientRef.current) {
          try {
            await videoTrack.setEnabled(true);
            await clientRef.current.publish(videoTrack);
            if (localVideoRef.current) videoTrack.play(localVideoRef.current);
          } catch {
            /* non-fatal */
          }
        }
        setError(err instanceof Error ? err.message : t('errors.screenShareFailed'));
        return;
      }

      screenShareTrackRef.current = screenTrack as unknown as IAgoraRTCRemoteUser;

      screenTrack.on('track-ended', () => {
        void stopScreenShare();
      });

      if (!clientRef.current || status !== 'connected') {
        (screenTrack as unknown as { close?: () => void }).close?.();
        screenShareTrackRef.current = null;
        if (videoTrack && client) {
          try {
            await videoTrack.setEnabled(true);
            await client.publish(videoTrack);
            if (localVideoRef.current) videoTrack.play(localVideoRef.current);
          } catch {
            /* non-fatal */
          }
        }
        setError(t('errors.connectionLost'));
        return;
      }

      if (localVideoRef.current) screenTrack.play(localVideoRef.current);
      await clientRef.current.publish(screenTrack);
      setIsScreenSharing(true);
      setError(null);
    } catch (err) {
      await stopScreenShare();
      setError(err instanceof Error ? err.message : t('errors.screenShareFailed'));
    }
  }, [isScreenSharing, status, t, stopScreenShare]);

  // ── Early returns ─────────────────────────────────────────────────────────────

  if (status === 'ended') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-lg">{t('sessionEnded')}</p>
        {onCallEnded ? <Button onClick={onCallEnded}>{t('returnToCourse')}</Button> : null}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="text-destructive h-10 w-10" />
        <p className="text-destructive font-medium">{error ?? t('errors.joinFailed')}</p>
        <Button variant="outline" onClick={onCallEnded}>
          {t('goBack')}
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 select-none">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              title={t('goBack')}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-white transition-colors hover:bg-zinc-700">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div>
            <h2 className="text-sm leading-tight font-semibold text-white">
              {config.sessionTitle ?? t('liveSession')}
            </h2>
            <p className="text-xs text-zinc-400">
              {totalParticipants} {t('participants')}
            </p>
          </div>
        </div>

        {/* Network quality pill */}
        <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-3 py-1.5">
          {status === 'connected' ? (
            networkQuality === 'poor' ? (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            )
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
          )}
          <span className="text-xs font-medium text-zinc-300">
            {status === 'joining'
              ? t('status.joining')
              : status === 'reconnecting'
                ? t('status.reconnecting')
                : networkQuality === 'poor'
                  ? t('networkPoor')
                  : t('connected')}
          </span>
        </div>
      </div>

      {/* ── Banners ─────────────────────────────────────────────────────────── */}
      {joinedWithoutVideo && status === 'connected' ? (
        <div className="mx-4 mt-2 shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          {t('warnings.audioOnlyNoCamera')}
        </div>
      ) : null}
      {error && status === 'connected' ? (
        <div className="mx-4 mt-2 flex shrink-0 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto font-bold hover:text-white">
            ×
          </button>
        </div>
      ) : null}

      {/* ── Video area ──────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        {isGridView ? (
          // ── Grid layout ───────────────────────────────────────────────────────
          <div className={cn('grid min-h-0 flex-1 content-start gap-2 overflow-auto', gridCols)}>
            {/* Local tile */}
            <div
              className="relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-700"
              style={{ aspectRatio: '16/9' }}>
              <div ref={localVideoRef} className="h-full w-full" />
              {!isCamOn && !isScreenSharing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/90">
                  <AvatarPlaceholder size="md" />
                </div>
              )}
              {isScreenSharing ? (
                <span className="absolute top-1 left-1 rounded bg-blue-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {t('sharingScreen')}
                </span>
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white drop-shadow">{t('you')}</span>
                {!isMicOn && <MicOff className="h-3 w-3 text-red-400" />}
              </div>
            </div>

            {/* Remote tiles */}
            {remoteEntries.map((entry) => {
              const uid = toNumericUid(entry.user.uid);
              return (
                <div
                  key={uid}
                  className="relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-700"
                  style={{ aspectRatio: '16/9' }}>
                  <div
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(uid, el);
                        if (entry.hasVideo && entry.user.videoTrack) entry.user.videoTrack.play(el);
                      } else {
                        remoteVideoRefs.current.delete(uid);
                      }
                    }}
                    className="h-full w-full"
                  />
                  {!entry.hasVideo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900">
                      <AvatarPlaceholder size="md" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white drop-shadow">
                      {t('participant')} {uid}
                    </span>
                    {!entry.hasAudio && <MicOff className="h-3 w-3 text-red-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── Speaker / PiP layout ──────────────────────────────────────────────
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-zinc-900">
            {/* Primary remote video (full area) */}
            {primaryEntry ? (
              <>
                <div className="absolute inset-0">
                  <div ref={mainRemoteRef} className="h-full w-full" />
                </div>
                {/* Camera-off avatar */}
                {!primaryEntry.hasVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
                    <AvatarPlaceholder size="lg" />
                    <span className="text-sm text-zinc-400">
                      {t('participant')} {toNumericUid(primaryEntry.user.uid)}
                    </span>
                  </div>
                )}
                {/* Bottom gradient */}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                {/* Name + mic indicator */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-white drop-shadow">
                    {t('participant')} {toNumericUid(primaryEntry.user.uid)}
                  </span>
                  {!primaryEntry.hasAudio && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600/80">
                      <MicOff className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
              </>
            ) : (
              /* Waiting for others */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 ring-4 ring-zinc-700">
                  <Users className="h-12 w-12 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400">{t('waitingForOthers')}</p>
              </div>
            )}

            {/* Local video — always the same DOM node; CSS controls its size/position */}
            <div
              className={cn(
                'absolute overflow-hidden bg-zinc-900 shadow-2xl ring-2 transition-all duration-300',
                primaryEntry
                  ? 'right-3 bottom-3 z-10 h-28 w-40 cursor-pointer rounded-xl ring-zinc-600 hover:ring-blue-500/60'
                  : 'inset-0 rounded-none ring-0'
              )}>
              <div ref={localVideoRef} className="h-full w-full" />

              {/* Camera-off overlay */}
              {!isCamOn && !isScreenSharing && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm">
                  {primaryEntry ? (
                    <VideoOff className="h-6 w-6 text-zinc-400" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <AvatarPlaceholder size="lg" />
                      <span className="text-sm text-zinc-400">{t('you')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Screen sharing badge */}
              {isScreenSharing ? (
                <span className="absolute top-1 left-1 rounded bg-blue-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {t('sharingScreen')}
                </span>
              ) : null}

              {/* Bottom gradient + label */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white drop-shadow">{t('you')}</span>
                {!isMicOn && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600/80">
                    <MicOff className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Sidebar strip: other remote participants (speaker view only) ──── */}
        {!isGridView && sidebarEntries.length > 0 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
            {sidebarEntries.map((entry) => {
              const uid = toNumericUid(entry.user.uid);
              const isPinned = pinnedUid === uid;
              return (
                <button
                  key={uid}
                  type="button"
                  title={`${t('participant')} ${uid}`}
                  onClick={() => setPinnedUid(isPinned ? null : uid)}
                  className={cn(
                    'relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-900 ring-1 transition-all',
                    isPinned ? 'ring-blue-500' : 'ring-zinc-700 hover:ring-zinc-500'
                  )}>
                  <div
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(uid, el);
                        if (entry.hasVideo && entry.user.videoTrack) entry.user.videoTrack.play(el);
                      } else {
                        remoteVideoRefs.current.delete(uid);
                      }
                    }}
                    className="h-full w-full"
                  />
                  {!entry.hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                      <AvatarPlaceholder size="sm" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-1 left-1.5 flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-white drop-shadow">P{uid}</span>
                    {!entry.hasAudio && <MicOff className="h-2.5 w-2.5 text-red-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Controls bar ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-900/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-center gap-2">
          {/* Mic toggle */}
          <ControlButton
            onClick={() => void toggleMic()}
            icon={isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            label={isMicOn ? t('controls.muteMic') : t('controls.unmuteMic')}
            className={
              isMicOn
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-red-900/50 text-red-400 ring-1 ring-red-800/50 hover:bg-red-900/70'
            }
          />

          {/* Camera toggle */}
          <ControlButton
            onClick={() => void toggleCam()}
            disabled={joinedWithoutVideo}
            icon={isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            label={isCamOn ? t('controls.hideCamera') : t('controls.showCamera')}
            className={
              isCamOn
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-red-900/50 text-red-400 ring-1 ring-red-800/50 hover:bg-red-900/70'
            }
          />

          {/* Screen share */}
          <ControlButton
            onClick={() => void toggleScreenShare()}
            icon={<Share2 className="h-5 w-5" />}
            label={isScreenSharing ? t('controls.stopShare') : t('controls.shareScreen')}
            className={
              isScreenSharing
                ? 'bg-blue-700/50 text-blue-300 ring-1 ring-blue-600/50 hover:bg-blue-700/70'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }
          />

          {/* Grid / Speaker view toggle */}
          <ControlButton
            onClick={() => setIsGridView((v) => !v)}
            icon={isGridView ? <Monitor className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
            label={isGridView ? t('controls.speakerView') : t('controls.gridView')}
            className={
              isGridView
                ? 'bg-purple-700/40 text-purple-300 ring-1 ring-purple-600/50 hover:bg-purple-700/60'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }
          />

          <div className="mx-1 h-8 w-px bg-zinc-700" />

          {/* End call */}
          <button
            type="button"
            onClick={() => void endCall()}
            title={t('controls.endCall')}
            className="flex flex-col items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-white transition-all duration-150 hover:bg-red-700 active:scale-95">
            <PhoneOff className="h-5 w-5" />
            <span className="text-[10px] leading-none font-semibold">{t('controls.endCall')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
