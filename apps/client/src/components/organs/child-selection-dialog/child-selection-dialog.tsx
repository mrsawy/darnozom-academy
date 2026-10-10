'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group';
import { Label } from '@/components/atoms/label';
import { Badge } from '@/components/atoms/badge';
import { useTranslations } from 'next-intl';
import { useChildren } from '@/lib/hooks/parent/useParent.hook';
import { ChildSelectionDialogSkeleton } from './child-selection-dialog.skeleton';
import type { IChild } from '@/lib/types/parent/parent-children.interface';
import {
  getChildrenEnrollmentStatus,
  type ChildEnrollmentStatus,
} from '@/lib/actions/enrollment/getChildrenEnrollmentStatus.action';

interface ChildSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (child: IChild, enrollmentStatus?: ChildEnrollmentStatus) => void;
  title?: string;
  courseId?: string;
}

export function ChildSelectionDialog({
  open,
  onClose,
  onSelect,
  title,
  courseId,
}: ChildSelectionDialogProps) {
  const t = useTranslations('ParentDashboard.childSelection');
  const { data: children = [], isLoading } = useChildren();
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [enrollmentStatuses, setEnrollmentStatuses] = useState<
    Record<string, ChildEnrollmentStatus>
  >({});

  useEffect(() => {
    if (!open || !courseId || children.length === 0) return;
    const childIds = children.map((c) => c._id);
    void getChildrenEnrollmentStatus(childIds, courseId).then(setEnrollmentStatuses);
  }, [open, courseId, children]);

  const getStatusBadge = (childId: string) => {
    const status = enrollmentStatuses[childId];
    if (!status || !courseId) return null;
    if (status.enrolled && status.expired) {
      return <Badge className="bg-red-500 text-xs">{t('enrolledExpired')}</Badge>;
    }
    if (status.enrolled) {
      return <Badge className="bg-green-500 text-xs">{t('enrolled')}</Badge>;
    }
    return (
      <Badge variant="outline" className="text-xs">
        {t('notEnrolled')}
      </Badge>
    );
  };

  const isChildDisabled = (childId: string) => {
    const status = enrollmentStatuses[childId];
    // Active enrollment — can't re-enroll
    return status?.enrolled && !status.expired;
  };

  const handleConfirm = () => {
    const child = children.find((c) => c._id === selectedChildId);
    if (child) {
      onSelect(child, enrollmentStatuses[child._id]);
      setSelectedChildId('');
    }
  };

  const handleClose = () => {
    setSelectedChildId('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? t('title')}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <ChildSelectionDialogSkeleton />
        ) : children.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('noChildren')}</p>
        ) : (
          <RadioGroup
            value={selectedChildId}
            onValueChange={(val) => {
              if (!isChildDisabled(val)) setSelectedChildId(val);
            }}
            className="space-y-2 py-2">
            {children.map((child) => {
              const disabled = isChildDisabled(child._id);
              const status = enrollmentStatuses[child._id];
              const isExpired = status?.enrolled && status.expired;
              return (
                <div
                  key={child._id}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    disabled
                      ? 'cursor-not-allowed border-green-200 bg-green-50/50 opacity-60'
                      : isExpired
                        ? 'border-red-200 bg-red-50/30 hover:bg-red-50/60'
                        : 'hover:bg-accent'
                  }`}
                  onClick={() => {
                    if (!disabled) setSelectedChildId(child._id);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                      e.preventDefault();
                      setSelectedChildId(child._id);
                    }
                  }}>
                  <RadioGroupItem value={child._id} id={child._id} disabled={disabled} />
                  <Label htmlFor={child._id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {child.firstName} {child.lastName}
                      </span>
                      {getStatusBadge(child._id)}
                    </div>
                    <span className="text-muted-foreground block text-xs">
                      {child.username} · {child.email}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedChildId || isLoading}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
