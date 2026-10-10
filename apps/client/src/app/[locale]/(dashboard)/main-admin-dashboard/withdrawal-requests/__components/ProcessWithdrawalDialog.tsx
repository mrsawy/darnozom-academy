'use client';

import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Loader2, Upload, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import { Label } from '@/components/atoms/label';
import { Badge } from '@/components/atoms/badge';
import { Separator } from '@/components/atoms/separator';
import { useTranslations } from 'next-intl';
import { WithdrawalMethod, WithdrawalRequestStatus } from '@lms-organization/shared-types';
import { IWithdrawalRequest } from '@/lib/types/withdrawal/withdrawal-request.interface';
import { useProcessWithdrawalRequest } from '@/lib/hooks/withdrawal/use-withdrawal';
import { uploadFile } from '@/lib/utils/uploadFile';
import { toast } from 'react-toastify';

interface ProcessWithdrawalDialogProps {
  request: IWithdrawalRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MethodBadge({ method }: { method: WithdrawalMethod }) {
  const t = useTranslations('AdminWithdrawalRequests.method');
  return <Badge variant="outline">{t(method)}</Badge>;
}

export function ProcessWithdrawalDialog({
  request,
  open,
  onOpenChange,
}: ProcessWithdrawalDialogProps) {
  const t = useTranslations('AdminWithdrawalRequests.dialog');
  const [adminNote, setAdminNote] = useState('');
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: process, isPending } = useProcessWithdrawalRequest();

  const handleClose = () => {
    setAdminNote('');
    setUploadedKeys([]);
    onOpenChange(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const keys: string[] = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const key = await uploadFile(
          buffer,
          `withdrawal-proof/${Date.now()}-${file.name}`,
          file.type,
          false
        );
        keys.push(key);
      }
      setUploadedKeys((prev) => [...prev, ...keys]);
      toast.success(`${keys.length} image(s) uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApprove = () => {
    if (!request) return;
    process(
      {
        id: request._id,
        data: {
          status: WithdrawalRequestStatus.APPROVED,
          adminNote: adminNote || undefined,
          proofImageKeys: uploadedKeys,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('approveSuccess'));
          handleClose();
        },
      }
    );
  };

  const handleReject = () => {
    if (!request) return;
    process(
      {
        id: request._id,
        data: {
          status: WithdrawalRequestStatus.REJECTED,
          adminNote: adminNote || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('rejectSuccess'));
          handleClose();
        },
      }
    );
  };

  if (!request) return null;

  const user = request.user;
  const userName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : request.userId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 space-y-3 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('userInfo')}</span>
              <span className="font-medium">{userName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('amount')}</span>
              <span className="font-semibold">
                {request.currency} {request.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('method')}</span>
              <MethodBadge method={request.method} />
            </div>
            <div className="text-muted-foreground text-xs">
              {format(new Date(request.createdAt), 'PPp')}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t('methodDetails')}</p>
            <div className="bg-muted/30 space-y-1 rounded-md p-3">
              {Object.entries(request.methodDetails).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replaceAll(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="max-w-[55%] truncate text-right font-medium">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {request.userNote ? (
            <div>
              <p className="mb-1 text-sm font-medium">{t('userNote')}</p>
              <p className="text-muted-foreground bg-muted/30 rounded-md p-3 text-sm">
                {request.userNote}
              </p>
            </div>
          ) : null}

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="admin-note">{t('adminNote')}</Label>
            <Textarea
              id="admin-note"
              placeholder={t('adminNotePlaceholder')}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">{t('proofImages')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFileUpload(e)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}>
              {uploadingFiles ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploadingFiles ? t('uploadingProof') : t('uploadProof')}
            </Button>

            {uploadedKeys.length > 0 ? (
              <div className="mt-2 space-y-1">
                {uploadedKeys.map((key, i) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                    <span className="text-muted-foreground truncate">{key.split('/').pop()}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive ml-auto shrink-0"
                      onClick={() => setUploadedKeys((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={handleApprove}
              disabled={isPending || uploadingFiles}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {t('approve')}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleReject}
              disabled={isPending || uploadingFiles}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              {t('reject')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
