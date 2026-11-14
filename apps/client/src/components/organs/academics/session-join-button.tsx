'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { MeetingProvider } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { useRouter } from '@/i18n/navigation';
import { joinSession } from '@/lib/actions/academics/sessions.action';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { safeHref } from '@/lib/utils/academics/safe-href';

interface SessionJoinButtonProps {
  sessionId: string;
  provider?: MeetingProvider;
  /** In-platform call page for this session (used for Agora groups). */
  callHref: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
}

/**
 * Joining through the platform is what records attendance.
 * Agora groups go to the in-app call page (which joins); external links are recorded first, then opened.
 */
export function SessionJoinButton({ sessionId, provider, callHref, disabled, size = 'sm' }: SessionJoinButtonProps) {
  const t = useTranslations('Academics');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    if (provider === MeetingProvider.AGORA) {
      router.push(callHref);
      return;
    }
    // Open the tab synchronously (inside the click) so popup blockers allow it, then point it at the link.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    setPending(true);
    try {
      const result = await joinSession(sessionId);
      if (isNatsErrResult(result)) {
        tab?.close();
        toast.error(translateApiMessage(result.err.message, tErrors));
        return;
      }
      const href = safeHref(result.meetingLink);
      if (!href) {
        tab?.close();
        toast.error(t('sessions.join.noLink'));
        return;
      }
      if (tab) tab.location.href = href;
      else window.open(href, '_blank', 'noopener,noreferrer');
    } catch {
      tab?.close();
      toast.error(t('sessions.join.failed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size={size} disabled={disabled || pending} onClick={() => void onClick()}>
      {t('sessions.join.button')}
    </Button>
  );
}
