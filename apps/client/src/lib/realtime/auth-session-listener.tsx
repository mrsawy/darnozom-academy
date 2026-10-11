'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_ID_COOKIE_NAME } from '@darnozom/shared-types';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import useUserStore from '@/lib/store/userStore';
import type { INotification } from '@/lib/actions/notification/notification.action';
import { connectRealtimeSocket, getCurrentSid, RealtimeEvents } from './realtime-socket';
import { handleRealtimeNotificationArrival } from './notifications/handle-notification';

interface AuthSessionListenerProps {
  locale: string;
}

interface SessionReplacedPayload {
  message?: string;
  targetSid?: string;
  loggedOutAt?: string;
}

const REDIRECT_COUNTDOWN_SECONDS = 6;

export default function AuthSessionListener({ locale }: AuthSessionListenerProps) {
  const t = useTranslations('errors');
  const tNotifications = useTranslations('Notifications');
  const isHandlingLogout = useRef(false);
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [sessionReplacedCountdown, setSessionReplacedCountdown] = useState<number | null>(null);

  // Cookie-store sync: if the auth cookie is gone but the store still has user
  // data (e.g. cookie expired, proxy cleared cookies, cleanup route ran),
  // wipe the stale client-side state so the UI doesn't flash a logged-in state.
  useEffect(() => {
    const hasAuthCookie = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${SESSION_ID_COOKIE_NAME}=`));
    if (!hasAuthCookie && useUserStore.getState().user) {
      useUserStore.getState().clearUser();
    }
  });

  // Countdown timer: when it hits 0, call cleanup and redirect
  useEffect(() => {
    if (sessionReplacedCountdown === null) return;
    if (sessionReplacedCountdown <= 0) {
      const redirectPath = `/${locale}/login`;
      globalThis.location.href = `/api/auth/cleanup?redirect=${encodeURIComponent(redirectPath)}`;
      return;
    }
    const id = setInterval(() => {
      setSessionReplacedCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionReplacedCountdown, locale]);

  useEffect(() => {
    const socket = connectRealtimeSocket();
    if (!socket) return;

    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('realtime connected', socket.id);
    });

    socket.on('connect_error', (error) => {
      // eslint-disable-next-line no-console
      console.warn('realtime connect_error', error.message);
    });

    socket.on('disconnect', (reason) => {
      // eslint-disable-next-line no-console
      console.warn('realtime disconnected', reason);
    });

    socket.on(RealtimeEvents.AUTH_SESSION_REPLACED, (payload: SessionReplacedPayload) => {
      const currentSid = getCurrentSid();
      if (payload.targetSid && currentSid && payload.targetSid !== currentSid) return;
      if (isHandlingLogout.current) return;
      isHandlingLogout.current = true;

      // Clear client-side state immediately so the UI reflects logged-out
      useUserStore.getState().clearUser();
      setSessionReplacedCountdown(REDIRECT_COUNTDOWN_SECONDS);
    });

    socket.on(RealtimeEvents.NOTIFICATION_COURSE_CONTENT_CREATED, (notification: INotification) => {
      handleRealtimeNotificationArrival(notification, queryClient, tNotifications);
    });

    return () => {
      socket.disconnect();
    };
  }, [locale, pathname, queryClient, tNotifications]);

  return (
    <Dialog open={sessionReplacedCountdown !== null}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('sessionReplacedByAnotherDevice')}</DialogTitle>
          <DialogDescription>
            {sessionReplacedCountdown !== null &&
              t('sessionReplacedRedirectIn', { seconds: sessionReplacedCountdown })}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
