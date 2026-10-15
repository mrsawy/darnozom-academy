'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { IconAlertTriangle, IconCertificate, IconCheck, IconShieldCheck } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useVerifyCertificate } from '@/lib/hooks/certificate/use-certificate.hook';

interface VerifyPageProps {
  params: Promise<{ token: string; locale: string }>;
}

export default function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { token } = use(params);
  const t = useTranslations('Certificates');
  const { data: record, isLoading, isError } = useVerifyCertificate(token);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError || !record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md border-destructive/30 shadow-lg text-center">
          <CardHeader>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <IconAlertTriangle className="size-8" />
            </div>
            <CardTitle className="text-xl text-destructive">{t('verification.invalidTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t('verification.invalidDescription')}</p>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/">{t('verification.backHome')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const issuedDate = record.issuedAt
    ? new Date(record.issuedAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const issuedDateEn = record.issuedAt
    ? new Date(record.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-lg border border-emerald-500/30 bg-white/80 shadow-2xl backdrop-blur-sm dark:bg-slate-900/90">
        {/* Verification Success Header Banner */}
        <div className="rounded-t-lg bg-emerald-600 px-6 py-5 text-center text-white">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <IconShieldCheck className="size-8 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t('verification.validTitle')}</h1>
          <p className="text-emerald-100 text-xs mt-1">{t('verification.validSubtitle')}</p>
        </div>

        <CardContent className="space-y-6 p-6">
          {/* Student Info */}
          <div className="border-b pb-4 text-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground block">
              {t('verification.awardedTo')}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {record.studentNameAr || record.studentNameEn}
            </h2>
            {record.studentNameEn && record.studentNameAr && (
              <p className="text-sm text-muted-foreground mt-0.5">{record.studentNameEn}</p>
            )}
          </div>

          {/* Academic Details */}
          <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
            {record.organizationName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('verification.organization')}:</span>
                <span className="font-semibold">{record.organizationName}</span>
              </div>
            )}

            {record.courseName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('verification.course')}:</span>
                <span className="font-semibold">{record.courseName}</span>
              </div>
            )}

            {record.levelName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('verification.level')}:</span>
                <span className="font-semibold">{record.levelName}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('verification.serial')}:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {record.serial}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('verification.issueDate')}:</span>
              <span className="font-medium">
                {issuedDate} <span className="text-xs text-muted-foreground">({issuedDateEn})</span>
              </span>
            </div>
          </div>

          {/* Authenticity Guarantee Note */}
          <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <IconCheck className="size-4 shrink-0 mt-0.5" />
            <p>{t('verification.officialRecordNotice')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
