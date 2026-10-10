'use client';

import { useRef } from 'react';
import { QrCode } from '@/components/molecules';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog';
import { buildCheckInUrl } from '@/lib/utils/build-check-in-url';
import { QrCode as QrCodeIcon, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CourseQrDialogProps {
  courseId: string;
  courseName?: string;
}

export function CourseQrDialog({ courseId, courseName }: CourseQrDialogProps) {
  const t = useTranslations('CourseForm');
  const qrValue = buildCheckInUrl(courseId);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const area = printAreaRef.current;
    if (!area) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.append(iframe);
    const html = `<!DOCTYPE html><html><head><title>QR Code</title><style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
        img { max-width: 300px; }
        p { font-size: 16px; font-weight: 600; margin-top: 12px; }
      </style></head><body>${area.innerHTML}</body></html>`;
    iframe.addEventListener('load', () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    });
    iframe.srcdoc = html;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="flex items-center gap-2">
          <QrCodeIcon className="h-4 w-4" />
          {t('viewQrCode')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('qrCode')}</DialogTitle>
        </DialogHeader>

        <div ref={printAreaRef} className="flex flex-col items-center gap-4 py-4">
          <QrCode value={qrValue} size={240} />
          {courseName ? <p className="text-center text-base font-semibold">{courseName}</p> : null}
          <p className="text-muted-foreground text-center text-sm">{t('scanToCheckIn')}</p>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          {t('printQrCode')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
