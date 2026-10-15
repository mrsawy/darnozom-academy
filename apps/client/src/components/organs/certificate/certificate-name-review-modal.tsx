'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ICertificate } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import {
  useConfirmCertificateName,
  useUpdateCertificateName,
} from '@/lib/hooks/certificate/use-certificate.hook';

interface CertificateNameReviewModalProps {
  certificate: ICertificate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canConfirm?: boolean;
}

export function CertificateNameReviewModal({
  certificate,
  open,
  onOpenChange,
  canConfirm = true,
}: CertificateNameReviewModalProps) {
  const t = useTranslations('Certificates');
  const updateName = useUpdateCertificateName();
  const confirmName = useConfirmCertificateName();

  const [nameAr, setNameAr] = useState(certificate.nameAr || '');
  const [nameEn, setNameEn] = useState(certificate.nameEn || '');

  const isConfirmed = Boolean(certificate.nameConfirmedAt);
  const isPending = updateName.isPending || confirmName.isPending;

  const handleSaveAndConfirm = async () => {
    // If names changed, update them first
    if (nameAr !== certificate.nameAr || nameEn !== certificate.nameEn) {
      await updateName.mutateAsync({
        id: certificate._id,
        data: { nameAr, nameEn },
      });
    }

    // Then confirm
    await confirmName.mutateAsync(certificate._id);
    onOpenChange(false);
  };

  const handleSaveOnly = async () => {
    await updateName.mutateAsync({
      id: certificate._id,
      data: { nameAr, nameEn },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('nameReview.title')}</DialogTitle>
          <DialogDescription>{t('nameReview.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="cert-name-ar">{t('nameReview.nameAr')}</Label>
            <Input
              id="cert-name-ar"
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={t('nameReview.nameArPlaceholder')}
              disabled={isConfirmed}
            />
            <p className="text-muted-foreground text-xs">{t('nameReview.nameArHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cert-name-en">{t('nameReview.nameEn')}</Label>
            <Input
              id="cert-name-en"
              dir="ltr"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t('nameReview.nameEnPlaceholder')}
              disabled={isConfirmed}
            />
            <p className="text-muted-foreground text-xs">{t('nameReview.nameEnHint')}</p>
          </div>

          {isConfirmed ? (
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {t('nameReview.alreadyConfirmed', {
                date: new Date(certificate.nameConfirmedAt!).toLocaleDateString(),
              })}
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {t('nameReview.confirmationWarning')}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>

          {!isConfirmed && (
            <>
              <Button
                variant="secondary"
                onClick={handleSaveOnly}
                disabled={isPending || (!nameAr.trim() && !nameEn.trim())}>
                {t('common.save')}
              </Button>
              {canConfirm && (
                <Button
                  onClick={handleSaveAndConfirm}
                  disabled={isPending || !nameAr.trim() || !nameEn.trim()}>
                  {t('nameReview.confirmButton')}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
