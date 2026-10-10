'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'react-toastify';
import { ROUTE_STUDENT_CHECK_IN } from '@/lib/data/constants/routes.constants';

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((m) => m.Scanner), {
  ssr: false,
});

function extractCourseId(text: string): string | null {
  try {
    const url = new URL(text);
    return url.searchParams.get('courseId');
  } catch {
    return null;
  }
}

export function QrScannerView() {
  const t = useTranslations('StudentCheckIn');
  const router = useRouter();

  const handleScan = (result: { rawValue: string }[]) => {
    const raw = result[0]?.rawValue;
    if (!raw) return;
    const courseId = extractCourseId(raw);
    if (!courseId) {
      toast.error(t('invalidQrCode'));
      return;
    }
    router.push(`${ROUTE_STUDENT_CHECK_IN}?courseId=${encodeURIComponent(courseId)}`);
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <p className="text-muted-foreground text-sm">{t('scannerPrompt')}</p>
      <div className="w-full overflow-hidden rounded-xl border">
        <Scanner
          onScan={handleScan}
          constraints={{ facingMode: 'environment' }}
          sound={false}
          styles={{ container: { width: '100%', aspectRatio: '1' } }}
        />
      </div>
    </div>
  );
}
