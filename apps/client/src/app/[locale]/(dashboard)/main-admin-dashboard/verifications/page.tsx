'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { IconCheck, IconX, IconEye, IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  usePendingVerifications,
  useVerificationDetail,
  useApproveIdentityVerification,
  useRejectIdentityVerification,
} from '@/lib/hooks/verification/useIdentityVerificationReview';
import type { IVerificationOrg } from '@/lib/types/verification/verification.interface';

export default function VerificationsReviewPage() {
  const t = useTranslations('AdminVerifications');
  const tDoc = useTranslations('Verification.identity.documentTypes');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');

  const { data, isLoading } = usePendingVerifications({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });

  const { data: detail, isLoading: detailLoading } = useVerificationDetail(selectedOrgId ?? '');
  const approve = useApproveIdentityVerification({ onSuccessMessage: t('dialog.approved') });
  const reject = useRejectIdentityVerification({ onSuccessMessage: t('dialog.rejected') });

  const handleApprove = useCallback(async () => {
    if (!selectedOrgId) return;
    await approve.mutateAsync(selectedOrgId);
    setSelectedOrgId(null);
  }, [selectedOrgId, approve]);

  const handleReject = useCallback(async () => {
    if (!selectedOrgId) return;
    await reject.mutateAsync({ orgId: selectedOrgId, comment: rejectionComment });
    setSelectedOrgId(null);
    setRejectionComment('');
  }, [selectedOrgId, rejectionComment, reject]);

  const closeDialog = useCallback(() => {
    setSelectedOrgId(null);
    setRejectionComment('');
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Input
        placeholder={t('table.organization')}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : data?.docs?.length ? (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('table.organization')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.superAdmin')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.documentType')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.submittedAt')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.docs.map((org: IVerificationOrg) => (
                  <tr key={org._id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{org.name}</td>
                    <td className="px-4 py-3">
                      {org.superAdmin
                        ? `${org.superAdmin.firstName} ${org.superAdmin.lastName}`
                        : '---'}
                    </td>
                    <td className="px-4 py-3">
                      {org.verification?.identity?.documentType
                        ? tDoc(org.verification.identity.documentType)
                        : '---'}
                    </td>
                    <td className="px-4 py-3">
                      {org.verification?.identity?.submittedAt
                        ? new Date(org.verification.identity.submittedAt).toLocaleDateString()
                        : '---'}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setSelectedOrgId(org._id)}>
                        <IconEye className="mr-1 h-4 w-4" />
                        {t('dialog.title')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasPrevPage}
                onClick={() => setPage(page - 1)}>
                &laquo;
              </Button>
              <span className="text-sm">
                {page} / {data.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasNextPage}
                onClick={() => setPage(page + 1)}>
                &raquo;
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground py-12 text-center">{t('noResults')}</p>
      )}

      <Dialog
        open={!!selectedOrgId}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-medium">{t('dialog.orgInfo')}</h3>
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('dialog.orgName')}:</span>{' '}
                  {detail.name}
                </p>
              </div>

              {detail.superAdmin ? (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">{t('dialog.adminInfo')}</h3>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('dialog.adminName')}:</span>{' '}
                    {detail.superAdmin.firstName} {detail.superAdmin.lastName}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('dialog.adminEmail')}:</span>{' '}
                    {detail.superAdmin.email}
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-medium">{t('dialog.documents')}</h3>
                {detail.verification?.identity?.documentType ? (
                  <p className="mb-2 text-sm">
                    <span className="text-muted-foreground">{t('dialog.documentType')}:</span>{' '}
                    {tDoc(detail.verification.identity.documentType)}
                  </p>
                ) : null}
                {detail.identityFileUrls && detail.identityFileUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {detail.identityFileUrls.map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary block truncate text-sm underline">
                        {t('dialog.documentLink', { number: index + 1 })}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('dialog.noDocuments')}</p>
                )}
              </div>

              <div className="space-y-2">
                <textarea
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder={t('dialog.rejectionPlaceholder')}
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                />
                <p className="text-muted-foreground text-xs">{t('dialog.rejectionMessage')}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => void handleApprove()}
                  disabled={approve.isPending}>
                  {approve.isPending ? (
                    <IconLoader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <IconCheck className="mr-1 h-4 w-4" />
                      {t('dialog.approve')}
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void handleReject()}
                  disabled={reject.isPending}>
                  {reject.isPending ? (
                    <IconLoader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <IconX className="mr-1 h-4 w-4" />
                      {t('dialog.reject')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
