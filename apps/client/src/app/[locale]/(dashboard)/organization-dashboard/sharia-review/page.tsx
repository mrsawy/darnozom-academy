'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  useApproveShariaVersion,
  useRejectShariaVersion,
  useShariaQueue,
} from '@/lib/hooks/course/use-sharia.hook';
import { ShariaQueue } from './__components/sharia-queue';

export default function ShariaReviewPage() {
  const t = useTranslations('Sharia');
  const { data: items = [], isLoading } = useShariaQueue();
  const approve = useApproveShariaVersion();
  const reject = useRejectShariaVersion();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sharia.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ShariaQueue
          items={items}
          isLoading={isLoading}
          onApprove={(vars) => approve.mutate(vars)}
          onReject={(vars) => reject.mutate(vars)}
        />
      </CardContent>
    </Card>
  );
}
