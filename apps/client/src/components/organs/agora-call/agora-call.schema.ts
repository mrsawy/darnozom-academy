import type { AgoraTokenResult } from '@/lib/actions/agora/agora.action';

export type AgoraCallStatus = 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended' | 'error';

export interface AgoraCallConfig extends AgoraTokenResult {
  /** Display name shown as the page/tab title while in call. */
  sessionTitle?: string;
}

export interface RemoteUser {
  uid: number;
  hasVideo: boolean;
  hasAudio: boolean;
}
