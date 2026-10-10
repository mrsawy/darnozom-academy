import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Alert, AlertDescription } from '@/components/atoms/alert';
import { Separator } from '@/components/atoms/separator';
import { Button } from '@/components/atoms/button';
import { AlertCircle, Wallet } from 'lucide-react';
import React from 'react';
import { useTranslations } from 'next-intl';
import { ROUTE_WALLET_CHARGE } from '@/lib/data/constants/routes.constants';

interface InsufficientBalanceDialogProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  coursePrice: number;
}

export const InsufficientBalanceDialog = React.memo<InsufficientBalanceDialogProps>(
  ({ open, onClose, currentBalance, coursePrice }: InsufficientBalanceDialogProps) => {
    const t = useTranslations('Wallet.insufficientBalance');

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive h-5 w-5" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{t('currentBalance')}</span>
                  <span className="font-bold">${currentBalance.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>{t('coursePrice')}</span>
                  <span className="font-bold">${coursePrice.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="text-destructive flex items-center justify-between">
                  <span>{t('needToAdd')}</span>
                  <span className="font-bold">${(coursePrice - currentBalance).toFixed(2)}</span>
                </div>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button
              onClick={() => {
                globalThis.location.href = ROUTE_WALLET_CHARGE;
              }}>
              {t('chargeWallet')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
export default InsufficientBalanceDialog;
