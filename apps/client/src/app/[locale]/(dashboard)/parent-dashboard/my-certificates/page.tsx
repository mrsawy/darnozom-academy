'use client';

import { useTranslations } from 'next-intl';
import { useCertificates } from '@/lib/hooks/certificate/use-certificate.hook';
import { CertificateCard } from '@/components/organs/certificate/certificate-card';

export default function ParentCertificatesPage() {
  const t = useTranslations('Certificates');
  const { data: certificates = [], isLoading } = useCertificates();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('myCertificates.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('myCertificates.description')}</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      ) : certificates.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <h3 className="font-semibold text-lg">{t('myCertificates.emptyTitle')}</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {t('myCertificates.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <CertificateCard key={cert._id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
