'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CertificateStatus } from '@darnozom/shared-types';
import type { ICertificate } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/atoms/card';
import { CertificateNameReviewModal } from './certificate-name-review-modal';

export function CertificateCard({ certificate }: { certificate: ICertificate }) {
  const t = useTranslations('Certificates');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const isIssued = certificate.status === CertificateStatus.ISSUED;
  const isNameReview = certificate.status === CertificateStatus.NAME_REVIEW;
  const isConfirmed = Boolean(certificate.nameConfirmedAt);

  return (
    <Card className="flex flex-col justify-between overflow-hidden border transition-shadow hover:shadow-md">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center justify-between gap-2">
          {isIssued ? (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
              {t('status.ISSUED')}
            </Badge>
          ) : isNameReview ? (
            <Badge className="bg-amber-500 text-white hover:bg-amber-600">
              {t('status.NAME_REVIEW')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-blue-600">
              {t('status.ELIGIBLE')}
            </Badge>
          )}

          {certificate.serial && (
            <span className="font-mono text-xs text-muted-foreground">{certificate.serial}</span>
          )}
        </div>

        <CardTitle className="text-lg">
          {certificate.nameAr || certificate.nameEn || t('card.unnamed')}
        </CardTitle>
        {certificate.nameAr && certificate.nameEn && (
          <p className="text-xs text-muted-foreground">{certificate.nameEn}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md bg-muted/40 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('card.attendance')}:</span>
            <span className="font-medium">
              {certificate.eligibility?.attendancePercent != null
                ? `${certificate.eligibility.attendancePercent}%`
                : '-'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('card.homework')}:</span>
            <span className="font-medium">
              {certificate.eligibility?.homeworkAverage != null
                ? `${certificate.eligibility.homeworkAverage}/5`
                : '-'}
            </span>
          </div>
        </div>

        {isNameReview && !isConfirmed && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-semibold">{t('card.nameActionRequired')}</p>
            <p className="mt-0.5">{t('card.nameActionRequiredDesc')}</p>
          </div>
        )}

        {isIssued && certificate.issuedAt && (
          <div className="text-xs text-muted-foreground">
            {t('card.issuedOn', { date: new Date(certificate.issuedAt).toLocaleDateString() })}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between gap-2 border-t bg-muted/10">
        {isNameReview && (
          <Button
            size="sm"
            variant={isConfirmed ? 'outline' : 'default'}
            className={!isConfirmed ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}
            onClick={() => setReviewModalOpen(true)}>
            {isConfirmed ? t('card.editName') : t('card.confirmName')}
          </Button>
        )}

        {isIssued && (
          <Button asChild size="sm" className="w-full">
            <Link href={`/certificates/${certificate._id}`} target="_blank">
              {t('card.viewCertificate')}
            </Link>
          </Button>
        )}
      </CardFooter>

      <CertificateNameReviewModal
        certificate={certificate}
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        canConfirm={true}
      />
    </Card>
  );
}
