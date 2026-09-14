'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/axios';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-2 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="p-6">
            {status === 'sent' ? (
              <p className="text-center text-sm">{t('sent')}</p>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-lg font-bold sm:text-2xl">{t('title')}</h1>
                  <p className="text-sm text-muted-foreground text-balance">{t('subtitle')}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">{t('emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {status === 'error' ? (
                  <p className="text-center text-sm text-destructive">{t('error')}</p>
                ) : null}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? t('submitting') : t('submit')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
