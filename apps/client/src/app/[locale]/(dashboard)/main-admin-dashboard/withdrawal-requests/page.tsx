'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { WithdrawalMethod, WithdrawalRequestStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs';
import { useAllWithdrawalRequests } from '@/lib/hooks/withdrawal/use-withdrawal';
import { IWithdrawalRequest } from '@/lib/types/withdrawal/withdrawal-request.interface';
import { ProcessWithdrawalDialog } from './__components/ProcessWithdrawalDialog';

type StatusFilter = WithdrawalRequestStatus | 'ALL';

function StatusBadge({ status }: { status: WithdrawalRequestStatus }) {
  const t = useTranslations('AdminWithdrawalRequests.status');

  const variants: Record<
    WithdrawalRequestStatus,
    'secondary' | 'default' | 'destructive' | 'outline'
  > = {
    [WithdrawalRequestStatus.PENDING]: 'secondary',
    [WithdrawalRequestStatus.APPROVED]: 'default',
    [WithdrawalRequestStatus.REJECTED]: 'destructive',
    [WithdrawalRequestStatus.CANCELLED]: 'outline',
  };

  return <Badge variant={variants[status]}>{t(status)}</Badge>;
}

function MethodLabel({ method }: { method: WithdrawalMethod }) {
  const t = useTranslations('AdminWithdrawalRequests.method');
  return <span>{t(method)}</span>;
}

export default function AdminWithdrawalRequestsPage() {
  const t = useTranslations('AdminWithdrawalRequests');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<IWithdrawalRequest | null>(null);

  const status = statusFilter === 'ALL' ? undefined : statusFilter;
  const { data, isLoading } = useAllWithdrawalRequests(page, 20, status);

  const handleTabChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const requests = data?.docs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Tabs value={statusFilter} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="ALL">{t('tabs.all')}</TabsTrigger>
          <TabsTrigger value={WithdrawalRequestStatus.PENDING}>{t('tabs.pending')}</TabsTrigger>
          <TabsTrigger value={WithdrawalRequestStatus.APPROVED}>{t('tabs.approved')}</TabsTrigger>
          <TabsTrigger value={WithdrawalRequestStatus.REJECTED}>{t('tabs.rejected')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('empty')}</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('table.user')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.amount')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.method')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.status')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.date')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req: IWithdrawalRequest) => {
                  const user = req.user;
                  const userName = user
                    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
                    : req.userId;

                  return (
                    <tr
                      key={req._id}
                      className="hover:bg-muted/30 border-b transition-colors last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{userName}</div>
                        {user?.email ? (
                          <div className="text-muted-foreground text-xs">{user.email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {req.currency} {req.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <MethodLabel method={req.method} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {format(new Date(req.createdAt), 'PP')}
                      </td>
                      <td className="px-4 py-3">
                        {req.status === WithdrawalRequestStatus.PENDING ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(req)}>
                            {t('process')}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setSelectedRequest(req)}>
                            {t('view')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}>
                &laquo;
              </Button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}>
                &raquo;
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ProcessWithdrawalDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}
      />
    </div>
  );
}
