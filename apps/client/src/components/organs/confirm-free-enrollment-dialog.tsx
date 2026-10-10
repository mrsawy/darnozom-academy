import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Separator } from '@/components/atoms/separator';
import { Button } from '@/components/atoms/button';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

interface ConfirmFreeEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseName: string;
}

export const ConfirmFreeEnrollmentDialog = React.memo<ConfirmFreeEnrollmentDialogProps>(
  ({ open, onClose, onConfirm, courseName }: ConfirmFreeEnrollmentDialogProps) => {
    const t = useTranslations('Courses.singleCourse.enrollment.confirmFreeEnrollment');

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">{t('courseLabel')}</span>
                <span className="text-sm font-medium">{courseName}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">{t('priceLabel')}</span>
                <span className="text-sm font-bold text-green-600">{t('free')}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={onConfirm} className="w-full">
              {t('confirm')}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

ConfirmFreeEnrollmentDialog.displayName = 'ConfirmFreeEnrollmentDialog';

export default ConfirmFreeEnrollmentDialog;
