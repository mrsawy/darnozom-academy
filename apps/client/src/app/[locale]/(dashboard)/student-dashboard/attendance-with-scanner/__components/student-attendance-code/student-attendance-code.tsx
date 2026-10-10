'use client';

import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useTranslations } from 'next-intl';

interface StudentAttendanceCodeProps {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * The student shows this to their instructor. Both codes encode the student's email:
 * the QR is for camera scanning, the Code128 barcode for a hardware laser scanner that
 * types the email straight into the org's attendance search.
 */
export function StudentAttendanceCode({ email, firstName, lastName }: StudentAttendanceCodeProps) {
  const t = useTranslations('AttendanceWithScanner');

  return (
    <div className="bg-card mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border p-6 shadow-sm">
      <div className="text-center">
        <p className="text-lg font-semibold">
          {firstName} {lastName}
        </p>
        <p className="text-muted-foreground text-sm">{email}</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl bg-white p-4">
          <QRCodeCanvas value={email} size={200} marginSize={4} />
        </div>
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          {t('qrLabel')}
        </span>
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <div className="w-full overflow-x-auto rounded-xl bg-white p-4">
          <div className="flex justify-center">
            <Barcode value={email} format="CODE128" displayValue={false} height={70} />
          </div>
        </div>
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          {t('barcodeLabel')}
        </span>
      </div>

      <p className="text-muted-foreground text-center text-sm">{t('instruction')}</p>
    </div>
  );
}
