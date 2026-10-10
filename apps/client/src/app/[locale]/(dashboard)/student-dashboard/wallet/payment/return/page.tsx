'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Button } from '@/components/atoms/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { usePaymentStatus } from '@/lib/hooks/wallet/use-wallet';
import { ROUTE_STUDENT_WALLET } from '@/lib/data/constants/routes.constants';

export default function PaymentReturnPage() {
  const t = useTranslations('WalletPaymentReturn');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checkStatus, setCheckStatus] = useState(true);

  const provider = searchParams.get('provider') ?? '';
  const paymentId = searchParams.get('paymentId') ?? searchParams.get('token') ?? '';

  const {
    data: paymentStatus,
    isLoading,
    error,
    refetch,
  } = usePaymentStatus(provider.toUpperCase(), paymentId, checkStatus);

  useEffect(() => {
    // Stop checking after 30 seconds
    const timeout = setTimeout(() => {
      setCheckStatus(false);
    }, 30_000);

    return () => clearTimeout(timeout);
  }, []);

  const handleReturnToWallet = () => {
    router.push(ROUTE_STUDENT_WALLET);
  };

  // Loading state
  if (isLoading || (!paymentStatus && checkStatus)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <Loader2 className="text-primary h-16 w-16 animate-spin" />
              <h2 className="text-2xl font-bold">{t('processingTitle')}</h2>
              <p className="text-muted-foreground">
                {t('processingBody')}
                <br />
                {t('doNotClose')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !paymentStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-6 w-6" />
              {t('unableToVerifyTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{t('unableToVerifyBody')}</AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  void refetch();
                }}
                className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('retry')}
              </Button>
              <Button onClick={handleReturnToWallet} className="flex-1">
                {t('returnToWallet')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (paymentStatus.status === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-6 w-6" />
              {t('successTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200">
                {t('walletCreditedTitle')}
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {t('walletCreditedBody', {
                  currency: paymentStatus.currency,
                  amount: paymentStatus.amount.toFixed(2),
                })}
              </AlertDescription>
            </Alert>

            <div className="bg-muted space-y-2 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('amount')}</span>
                <span className="font-semibold">
                  {paymentStatus.currency} {paymentStatus.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('transactionId')}</span>
                <span className="font-mono text-xs">
                  {paymentStatus.transactionId.slice(0, 20)}...
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('paymentMethod')}</span>
                <span className="font-semibold capitalize">{provider}</span>
              </div>
            </div>

            <Button onClick={handleReturnToWallet} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToWallet')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  if (paymentStatus.status === 'failed') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-6 w-6" />
              {t('failedTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>{t('transactionFailedTitle')}</AlertTitle>
              <AlertDescription>{t('transactionFailedBody')}</AlertDescription>
            </Alert>

            <div className="bg-muted space-y-2 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('transactionId')}</span>
                <span className="font-mono text-xs">{paymentStatus.transactionId}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReturnToWallet} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToWallet')}
              </Button>
              <Button onClick={() => router.push(ROUTE_STUDENT_WALLET)} className="flex-1">
                {t('tryAgain')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending state
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-yellow-500" />
            <h2 className="text-2xl font-bold">{t('pendingTitle')}</h2>
            <p className="text-muted-foreground">{t('pendingBody')}</p>
            <Button onClick={handleReturnToWallet} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('returnToWallet')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
