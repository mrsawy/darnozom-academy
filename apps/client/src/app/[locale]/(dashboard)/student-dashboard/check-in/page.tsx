import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Loader2 } from 'lucide-react';
import { QrScannerView } from './__components/qr-scanner-view';
import { CheckInResult } from './__components/check-in-result';

interface CheckInPageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function CheckInPage({ searchParams }: CheckInPageProps) {
  const { courseId } = await searchParams;
  const t = await getTranslations('StudentCheckIn');

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <Suspense fallback={<Loader2 className="text-primary h-8 w-8 animate-spin" />}>
        {courseId ? <CheckInResult courseId={courseId} /> : <QrScannerView />}
      </Suspense>
    </div>
  );
}
