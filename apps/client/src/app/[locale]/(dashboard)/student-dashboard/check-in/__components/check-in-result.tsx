'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Link } from '@/i18n/navigation';
import {
  ROUTE_STUDENT_COURSES,
  ROUTE_STUDENT_CHECK_IN,
} from '@/lib/data/constants/routes.constants';
import { useCheckIn } from '@/lib/hooks/attendance/use-check-in.hook';

interface CheckInResultProps {
  courseId: string;
}

export function CheckInResult({ courseId }: CheckInResultProps) {
  const t = useTranslations('StudentCheckIn');
  const { status, errorMessage } = useCheckIn(courseId);

  if (status === 'submitting') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="text-primary h-12 w-12 animate-spin" />
        <p className="text-muted-foreground text-sm">{t('submitting')}</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <p className="text-center text-lg font-semibold">{t('success')}</p>
        <Button asChild variant="outline">
          <Link href={ROUTE_STUDENT_COURSES}>{t('backToCourses')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <XCircle className="text-destructive h-16 w-16" />
      <p className="text-destructive text-center text-lg font-semibold">{errorMessage}</p>
      <Button asChild variant="outline">
        <Link href={ROUTE_STUDENT_CHECK_IN}>{t('openScanner')}</Link>
      </Button>
    </div>
  );
}
