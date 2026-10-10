'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, BookOpen, PackageCheck, Download } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTE_BOOKS, ROUTE_HOME } from '@/lib/data/constants/routes.constants';

export default function CheckoutSuccessPage() {
  const t = useTranslations('checkout.successPage');
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || 'ORD-' + Math.floor(100000 + Math.random() * 900000);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Card className="text-center overflow-hidden border-emerald-500/20 shadow-md">
        <div className="bg-emerald-500/10 py-8 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {t('subtitle')}
            </p>
          </div>

          {/* Order ID Box */}
          <div className="rounded-xl bg-muted/40 border p-4 max-w-sm mx-auto text-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider block mb-1">
              {t('orderReference')}
            </span>
            <span className="font-mono font-bold text-sm sm:text-base text-primary select-all">
              {orderId}
            </span>
          </div>

          <div className="border-t pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-start text-xs text-muted-foreground">
            <div className="flex gap-3 p-3 rounded-lg border bg-card">
              <PackageCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground block text-sm mb-0.5">{t('physicalOrdersTitle')}</strong>
                <span>{t('physicalOrdersDesc')}</span>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg border bg-card">
              <Download className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground block text-sm mb-0.5">{t('digitalOrdersTitle')}</strong>
                <span>{t('digitalOrdersDesc')}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link href={ROUTE_BOOKS}>
                <BookOpen className="h-4 w-4" />
                <span>{t('continueBrowsing')}</span>
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link href={ROUTE_HOME}>
                <span>{t('backToHome')}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
