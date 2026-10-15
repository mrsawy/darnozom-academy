'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { IconArrowLeft, IconCheck, IconPrinter, IconShare } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { useCertificate } from '@/lib/hooks/certificate/use-certificate.hook';

interface CertificatePageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function CertificatePage({ params }: CertificatePageProps) {
  const { id } = use(params);
  const t = useTranslations('Certificates');
  const { data: cert, isLoading, isError } = useCertificate(id);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && cert?.verificationToken) {
      const verifyUrl = `${window.location.origin}/verify/${cert.verificationToken}`;
      navigator.clipboard.writeText(verifyUrl);
      alert(t('printable.linkCopied'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/20 p-4">
        <p className="text-destructive font-medium">{t('printable.notFound')}</p>
        <Button asChild variant="outline">
          <Link href="/organization-dashboard/my-certificates">{t('printable.back')}</Link>
        </Button>
      </div>
    );
  }

  const issueDateFormatted = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const issueDateEn = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-slate-100 py-8 text-slate-800 dark:bg-slate-950 dark:text-slate-100 print:min-h-0 print:bg-white print:p-0 print:text-black">
      {/* Top Action Bar (hidden when printing) */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between px-4 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/organization-dashboard/my-certificates">
            <IconArrowLeft className="size-4" />
            {t('printable.back')}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
            <IconShare className="size-4" />
            {t('printable.shareVerification')}
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            <IconPrinter className="size-4" />
            {t('printable.printPdf')}
          </Button>
        </div>
      </div>

      {/* Certificate Frame (Landscape orientation print container) */}
      <div className="certificate-sheet mx-auto max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="relative m-4 border-8 border-double border-amber-600/30 p-8 sm:p-12 print:m-0 print:border-4 print:p-8">
          {/* Decorative Corner Ornaments */}
          <div className="pointer-events-none absolute top-2 left-2 size-12 border-t-2 border-l-2 border-amber-700" />
          <div className="pointer-events-none absolute top-2 right-2 size-12 border-t-2 border-r-2 border-amber-700" />
          <div className="pointer-events-none absolute bottom-2 left-2 size-12 border-b-2 border-l-2 border-amber-700" />
          <div className="pointer-events-none absolute bottom-2 right-2 size-12 border-b-2 border-r-2 border-amber-700" />

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1 text-xs font-semibold tracking-wider text-amber-800 uppercase border border-amber-200 print:bg-transparent">
              {t('printable.institutionHeader')}
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t('printable.certificateTitleAr')}
            </h1>
            <p className="font-sans text-xs tracking-widest text-slate-500 uppercase">
              {t('printable.certificateTitleEn')}
            </p>
          </div>

          {/* Statement */}
          <div className="my-8 text-center space-y-3">
            <p className="text-slate-600 text-sm">{t('printable.certifyThat')}</p>

            <div className="py-2">
              <h2 className="font-serif text-2xl font-extrabold text-emerald-800 sm:text-3xl">
                {cert.nameAr || cert.nameEn}
              </h2>
              {cert.nameEn && cert.nameAr && (
                <p className="text-slate-500 font-sans text-sm tracking-wide mt-1">{cert.nameEn}</p>
              )}
            </div>

            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-700">
              {t('printable.bodyText')}
            </p>
          </div>

          {/* Achievements Summary */}
          {cert.eligibility && (
            <div className="my-6 flex flex-wrap justify-center gap-4 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
                <span className="text-slate-500 block">{t('card.attendance')}</span>
                <span className="font-bold text-slate-800 text-sm">
                  {cert.eligibility.attendancePercent}%
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
                <span className="text-slate-500 block">{t('card.homework')}</span>
                <span className="font-bold text-slate-800 text-sm">
                  {cert.eligibility.homeworkAverage}/5
                </span>
              </div>
              {cert.eligibility.examPassed && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-emerald-800">
                  <span className="block">{t('table.exam')}</span>
                  <span className="font-bold text-sm">✓ {t('table.examPassed')}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer with Serial, Signatures, and QR Code */}
          <div className="mt-10 grid grid-cols-3 items-end gap-4 border-t border-slate-200 pt-6">
            {/* Left: Issue Date & Serial */}
            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-slate-500 block">{t('printable.issueDate')}</span>
                <span className="font-semibold text-slate-800">{issueDateFormatted}</span>
                <span className="text-slate-400 block text-[10px]">{issueDateEn}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block">{t('printable.serialNumber')}</span>
                <span className="font-mono font-bold text-slate-900">{cert.serial}</span>
              </div>
            </div>

            {/* Middle: Official Stamp / Seal */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="size-20 rounded-full border-4 border-double border-amber-600/60 flex items-center justify-center p-2 text-amber-800 font-serif text-[10px] uppercase tracking-tighter">
                <div className="text-center">
                  <IconCheck className="size-6 mx-auto text-emerald-600 mb-0.5" />
                  <span>{t('printable.verifiedSeal')}</span>
                </div>
              </div>
              <span className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest">
                {t('printable.officialCertification')}
              </span>
            </div>

            {/* Right: QR Code for Verification */}
            <div className="flex flex-col items-end text-xs">
              {cert.qrCodeDataUrl ? (
                <img
                  src={cert.qrCodeDataUrl}
                  alt="Certificate Verification QR Code"
                  className="size-24 border border-slate-200 p-1 rounded bg-white shadow-sm"
                />
              ) : null}
              <span className="mt-1 text-[10px] text-slate-500 text-right">
                {t('printable.scanToVerify')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Print media query styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .certificate-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
