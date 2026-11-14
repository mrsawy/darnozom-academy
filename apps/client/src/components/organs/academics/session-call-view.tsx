'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { MeetingProvider } from '@darnozom/shared-types';
import { AgoraCall } from '@/components/organs/agora-call/agora-call';
import type { AgoraCallConfig } from '@/components/organs/agora-call/agora-call.schema';
import { heartbeatSession, joinSession, leaveSession } from '@/lib/actions/academics/sessions.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';

const HEARTBEAT_MS = 60_000;

interface SessionCallViewProps {
  sessionId: string;
  backHref: string;
}

/** In-platform group call: joining records attendance, a heartbeat keeps the duration honest, leaving closes it. */
export function SessionCallView({ sessionId, backHref }: SessionCallViewProps) {
  const t = useTranslations('AgoraCall');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [config, setConfig] = useState<AgoraCallConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joined = useRef(false);

  const leave = useCallback(() => {
    if (!joined.current) return;
    joined.current = false;
    void leaveSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await joinSession(sessionId);
      if (cancelled) return;
      if (isNatsErrResult(result)) {
        setError(translateApiMessage(result.err.message, tErrors));
        return;
      }
      if (result.provider !== MeetingProvider.AGORA || !result.agora) {
        setError(t('notInPlatform'));
        return;
      }
      joined.current = true;
      setConfig({ ...result.agora, sessionTitle: t('groupSessionTitle') });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- translators are stable enough; re-joining on locale change would be wrong
  }, [sessionId]);

  useEffect(() => {
    if (!config) return;
    const timer = setInterval(() => void heartbeatSession(sessionId), HEARTBEAT_MS);
    window.addEventListener('pagehide', leave);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [config, sessionId, leave]);

  const renewToken = async () => {
    const result = await joinSession(sessionId);
    if (isNatsErrResult(result) || !result.agora) throw new Error('token renewal failed');
    return result.agora.token;
  };

  const goBack = () => {
    leave();
    router.push(backHref);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive text-center">{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>{t('status.joining')}</span>
      </div>
    );
  }

  return <AgoraCall config={config} renewToken={renewToken} onBack={goBack} onCallEnded={goBack} />;
}
