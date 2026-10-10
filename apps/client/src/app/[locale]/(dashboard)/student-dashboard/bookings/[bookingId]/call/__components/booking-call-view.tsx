'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { AgoraCall } from '@/components/organs/agora-call/agora-call';
import { requestPrivateSessionToken } from '@/lib/actions/agora/agora.action';
import type { AgoraCallConfig } from '@/components/organs/agora-call/agora-call.schema';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { ROUTE_STUDENT_BOOKINGS } from '@/lib/data/constants/routes.constants';

interface BookingCallViewProps {
  bookingId: string;
}

export default function BookingCallView({ bookingId }: BookingCallViewProps) {
  const t = useTranslations('AgoraCall');
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const router = useRouter();
  const [config, setConfig] = useState<AgoraCallConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await requestPrivateSessionToken(bookingId);
      if (isNatsErrResult(result)) {
        setError(result.err.message);
        return;
      }
      setConfig({ ...result, sessionTitle: tRef.current('privateSessionTitle') });
    })();
  }, [bookingId]);

  const renewToken = async () => {
    const result = await requestPrivateSessionToken(bookingId);
    if (isNatsErrResult(result)) throw new Error(result.err.message);
    return result.token;
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{error}</p>
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

  const handleBack = () => {
    router.push(ROUTE_STUDENT_BOOKINGS);
  };

  return (
    <AgoraCall
      config={config}
      renewToken={renewToken}
      onBack={handleBack}
      onCallEnded={handleBack}
    />
  );
}
