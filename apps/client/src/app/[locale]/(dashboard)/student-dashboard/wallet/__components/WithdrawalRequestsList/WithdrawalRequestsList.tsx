'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Skeleton } from '@/components/atoms/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { useTranslations } from 'next-intl';
import { WithdrawalMethod, WithdrawalRequestStatus } from '@lms-organization/shared-types';
import {
  useMyWithdrawalRequests,
  useCancelWithdrawalRequest,
} from '@/lib/hooks/withdrawal/use-withdrawal';
import { IWithdrawalRequest } from '@/lib/types/withdrawal/withdrawal-request.interface';
import { toast } from 'react-toastify';

function StatusBadge({ status }: { status: WithdrawalRequestStatus }) {
  const t = useTranslations('Wallet.withdrawalRequests.status');

  const config = {
    [WithdrawalRequestStatus.PENDING]: {
      icon: Clock,
      variant: 'secondary' as const,
    },
    [WithdrawalRequestStatus.APPROVED]: {
      icon: CheckCircle,
      variant: 'default' as const,
    },
    [WithdrawalRequestStatus.REJECTED]: {
      icon: XCircle,
      variant: 'destructive' as const,
    },
    [WithdrawalRequestStatus.CANCELLED]: {
      icon: Ban,
      variant: 'outline' as const,
    },
  };

  const { icon: Icon, variant } = config[status];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {t(status)}
    </Badge>
  );
}

function MethodLabel({ method }: { method: WithdrawalMethod }) {
  const t = useTranslations('Wallet.withdraw.methods');
  const keys: Record<
    WithdrawalMethod,
    'mobileWallet.label' | 'bankTransfer.label' | 'creditCard.label'
  > = {
    [WithdrawalMethod.MOBILE_WALLET]: 'mobileWallet.label',
    [WithdrawalMethod.BANK_TRANSFER]: 'bankTransfer.label',
    [WithdrawalMethod.CREDIT_CARD]: 'creditCard.label',
  };
  return <span>{t(keys[method])}</span>;
}

function RequestDetailModal({
  request,
  open,
  onOpenChange,
}: {
  request: IWithdrawalRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Wallet.withdrawalRequests');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('detail.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={request.status} />
            <span className="text-muted-foreground text-sm">
              {format(new Date(request.createdAt), 'PP')}
            </span>
          </div>

          <div className="bg-muted/50 space-y-2 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('detail.amount')}</span>
              <span className="font-semibold">
                {request.currency} {request.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('detail.method')}</span>
              <MethodLabel method={request.method} />
            </div>
            {Object.entries(request.methodDetails).map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">
                  {key.replaceAll(/([A-Z])/g, ' $1')}
                </span>
                <span className="max-w-[55%] truncate text-right font-medium">{String(val)}</span>
              </div>
            ))}
          </div>

          {request.userNote ? (
            <div>
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                {t('detail.yourNote')}
              </p>
              <p className="text-sm">{request.userNote}</p>
            </div>
          ) : null}

          {request.processedAt ? (
            <div className="text-muted-foreground text-sm">
              {t('detail.processedAt')}: {format(new Date(request.processedAt), 'PPp')}
            </div>
          ) : null}

          {request.adminNote ? (
            <div className="rounded-lg border p-4">
              <p className="mb-1 text-sm font-medium">{t('detail.adminNote')}</p>
              <p className="text-sm">{request.adminNote}</p>
            </div>
          ) : null}

          {request.proofImageUrls && request.proofImageUrls.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">{t('detail.proofImages')}</p>
              <div className="grid grid-cols-2 gap-2">
                {request.proofImageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external proof URL */}
                    <img
                      src={url}
                      alt={`Proof ${i + 1}`}
                      className="h-32 w-full rounded-md border object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequestCard({ request }: { request: IWithdrawalRequest }) {
  const t = useTranslations('Wallet.withdrawalRequests');
  const [detailOpen, setDetailOpen] = useState(false);
  const { mutate: cancel, isPending: cancelling } = useCancelWithdrawalRequest();

  const handleCancel = () => {
    cancel(request._id, {
      onSuccess: () => toast.success(t('cancelSuccess')),
    });
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {request.currency} {request.amount.toFixed(2)}
            </span>
            <StatusBadge status={request.status} />
            {request.proofImageUrls && request.proofImageUrls.length > 0 ? (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <ImageIcon className="h-3 w-3" />
                {t('hasProof')}
              </Badge>
            ) : null}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            <MethodLabel method={request.method} /> • {format(new Date(request.createdAt), 'PP')}
          </div>
        </div>
        <div className="ml-2 flex items-center gap-2">
          {request.status === WithdrawalRequestStatus.PENDING ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleCancel}
              disabled={cancelling}>
              {t('cancel')}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setDetailOpen(true)}>
            {t('viewDetails')}
          </Button>
        </div>
      </div>
      <RequestDetailModal request={request} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  );
}

export function WithdrawalRequestsList() {
  const t = useTranslations('Wallet.withdrawalRequests');
  const [page] = useState(1);
  const [expanded, setExpanded] = useState(true);
  const { data, isLoading } = useMyWithdrawalRequests(page);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const requests = data?.docs ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded ? (
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">{t('empty')}</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <RequestCard key={req._id} request={req} />
              ))}
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
