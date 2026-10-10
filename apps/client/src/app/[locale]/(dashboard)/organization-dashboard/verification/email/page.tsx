'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { IconCircleCheck, IconMail, IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { useVerificationStatus } from '@/lib/hooks/verification/useVerificationStatus';
import { useSendEmailOtp, useVerifyEmailOtp } from '@/lib/hooks/verification/useEmailVerification';

const RESEND_COOLDOWN_SECONDS = 60;

/** `embedded` drops the standalone card chrome so the org-verification wizard can host it inside its own card. */
export default function EmailVerificationPage({ embedded = false }: { embedded?: boolean } = {}) {
  const t = useTranslations('Verification.email');
  const cardClass = embedded ? '' : 'mx-auto max-w-md rounded-lg border p-8';
  const { data, isLoading } = useVerificationStatus();
  const sendOtp = useSendEmailOtp();
  const verifyOtp = useVerifyEmailOtp();

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = useCallback(async () => {
    try {
      await sendOtp.mutateAsync();
      setOtpSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      // error handled by hook
    }
  }, [sendOtp]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) return;
    try {
      await verifyOtp.mutateAsync(otp);
      setOtp('');
      setOtpSent(false);
    } catch {
      // error handled by hook
    }
  }, [otp, verifyOtp]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const emailVerified = data?.verification?.email?.verified;

  if (emailVerified) {
    return (
      <div className={`${cardClass} text-center`}>
        <IconCircleCheck className="text-success mx-auto mb-4 h-16 w-16" />
        <h2 className="mb-2 text-xl font-semibold">{t('verified')}</h2>
        {data?.verification?.email?.verifiedAt ? (
          <p className="text-muted-foreground text-sm">
            {t('verifiedAt', {
              date: new Date(data.verification.email.verifiedAt).toLocaleDateString(),
            })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="mb-6 text-center">
        <IconMail className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 className="mb-2 text-xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      {otpSent ? (
        <div className="space-y-4">
          <p className="text-center text-sm">{t('enterOtp')}</p>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replaceAll(/\D/g, '').slice(0, 6))}
            placeholder={t('otpPlaceholder')}
            className="text-center text-2xl tracking-[0.5em]"
          />
          <Button
            className="w-full"
            onClick={() => void handleVerify()}
            disabled={otp.length !== 6 || verifyOtp.isPending}>
            {verifyOtp.isPending ? (
              <IconLoader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              t('verify')
            )}
          </Button>
          <div className="text-center">
            {cooldown > 0 ? (
              <span className="text-muted-foreground text-sm">
                {t('resendCooldown', { seconds: cooldown })}
              </span>
            ) : (
              <button
                type="button"
                className="text-primary text-sm underline"
                onClick={() => void handleSendOtp()}
                disabled={sendOtp.isPending}>
                {t('resend')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <Button
          className="w-full"
          onClick={() => void handleSendOtp()}
          disabled={sendOtp.isPending}>
          {sendOtp.isPending ? (
            <IconLoader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            t('sendOtp')
          )}
        </Button>
      )}
    </div>
  );
}
