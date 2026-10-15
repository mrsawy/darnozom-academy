'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CertificateStatus } from '@darnozom/shared-types';
import type { ICertificate } from '@darnozom/shared-types';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import {
  useCertificates,
  useEvaluateCertificates,
  useIssueCertificate,
} from '@/lib/hooks/certificate/use-certificate.hook';
import type { IGroupDetail } from '@/lib/types/academics/academics';
import { CertificateNameReviewModal } from './certificate-name-review-modal';

export function GroupCertificatesCard({
  group,
  canManage,
}: {
  group: IGroupDetail;
  canManage: boolean;
}) {
  const t = useTranslations('Certificates');
  const { data: certificates = [], isLoading } = useCertificates({ groupId: group._id });
  const evaluate = useEvaluateCertificates();
  const issue = useIssueCertificate();

  const [reviewingCert, setReviewingCert] = useState<ICertificate | null>(null);

  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case CertificateStatus.ISSUED:
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
            {t('status.ISSUED')}
          </Badge>
        );
      case CertificateStatus.NAME_REVIEW:
        return (
          <Badge className="bg-amber-500 text-white hover:bg-amber-600">
            {t('status.NAME_REVIEW')}
          </Badge>
        );
      case CertificateStatus.ELIGIBLE:
      default:
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            {t('status.ELIGIBLE')}
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('groupTab.title')}</CardTitle>
          <p className="text-muted-foreground text-sm">{t('groupTab.subtitle')}</p>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => evaluate.mutate(group._id)}
            disabled={evaluate.isPending}>
            {evaluate.isPending ? t('groupTab.evaluating') : t('groupTab.evaluateButton')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : certificates.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">{t('groupTab.empty')}</p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => evaluate.mutate(group._id)}
                disabled={evaluate.isPending}>
                {t('groupTab.evaluateButton')}
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.student')}</TableHead>
                <TableHead>{t('table.attendance')}</TableHead>
                <TableHead>{t('table.homework')}</TableHead>
                <TableHead>{t('table.exam')}</TableHead>
                <TableHead>{t('table.payment')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.nameConfirmed')}</TableHead>
                <TableHead>{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((cert) => {
                const studentName =
                  group.people[cert.studentId] ||
                  cert.nameAr ||
                  cert.nameEn ||
                  cert.studentId;
                const isConfirmed = Boolean(cert.nameConfirmedAt);
                const isIssued = cert.status === CertificateStatus.ISSUED;

                return (
                  <TableRow key={cert._id}>
                    <TableCell>
                      <div className="font-medium">{studentName}</div>
                      {(cert.nameAr || cert.nameEn) && (
                        <div className="text-muted-foreground text-xs">
                          {cert.nameAr} {cert.nameEn ? `• ${cert.nameEn}` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {cert.eligibility?.attendancePercent != null
                        ? `${cert.eligibility.attendancePercent}%`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {cert.eligibility?.homeworkAverage != null
                        ? `${cert.eligibility.homeworkAverage}/5`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {cert.eligibility?.examPassed != null
                        ? cert.eligibility.examPassed
                          ? t('table.examPassed')
                          : t('table.examFailed')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {cert.eligibility?.fullyPaid != null
                        ? cert.eligibility.fullyPaid
                          ? t('table.paid')
                          : t('table.unpaid')
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(cert.status)}</TableCell>
                    <TableCell>
                      {isConfirmed ? (
                        <span className="text-emerald-600 text-xs font-medium">
                          ✓ {t('table.confirmed')}
                        </span>
                      ) : (
                        <span className="text-amber-600 text-xs font-medium">
                          {t('table.pendingReview')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReviewingCert(cert)}>
                            {t('table.editName')}
                          </Button>
                        )}

                        {isIssued ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/certificates/${cert._id}`} target="_blank">
                              {t('table.viewCertificate')}
                            </Link>
                          </Button>
                        ) : canManage ? (
                          <Button
                            size="sm"
                            disabled={!isConfirmed || issue.isPending}
                            title={!isConfirmed ? t('table.nameMustBeConfirmed') : undefined}
                            onClick={() => issue.mutate(cert._id)}>
                            {t('table.issue')}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {reviewingCert && (
          <CertificateNameReviewModal
            certificate={reviewingCert}
            open={Boolean(reviewingCert)}
            onOpenChange={(open) => {
              if (!open) setReviewingCert(null);
            }}
            canConfirm={canManage}
          />
        )}
      </CardContent>
    </Card>
  );
}
