'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useChildren } from '@/lib/hooks/parent/useParent.hook';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { IconLoader2, IconUser, IconUsers } from '@tabler/icons-react';

interface AiSubscriptionTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected userId (self or child). */
  onConfirm: (targetUserId: string | null) => void;
  currentUserId: string;
  isLoading?: boolean;
}

export function AiSubscriptionTargetModal({
  open,
  onOpenChange,
  onConfirm,
  currentUserId: _currentUserId,
  isLoading,
}: AiSubscriptionTargetModalProps) {
  const t = useTranslations('AiSubscriptionTargetModal');
  const [target, setTarget] = useState<'myself' | 'child'>('myself');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const { data: children, isLoading: childrenLoading } = useChildren();

  const handleConfirm = () => {
    if (target === 'myself') {
      onConfirm(null);
    } else {
      onConfirm(selectedChildId || null);
    }
  };

  const canConfirm = target === 'myself' || (target === 'child' && !!selectedChildId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup
            value={target}
            onValueChange={(v) => setTarget(v as 'myself' | 'child')}
            className="gap-3">
            <div className="hover:bg-muted/50 has-[[data-state=checked]]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value="myself" id="target-myself" />
              <Label htmlFor="target-myself" className="flex cursor-pointer items-center gap-2">
                <IconUser className="size-4" />
                {t('myself')}
              </Label>
            </div>
            <div className="hover:bg-muted/50 has-[[data-state=checked]]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value="child" id="target-child" />
              <Label htmlFor="target-child" className="flex cursor-pointer items-center gap-2">
                <IconUsers className="size-4" />
                {t('myChild')}
              </Label>
            </div>
          </RadioGroup>

          {target === 'child' ? (
            <div className="space-y-2">
              <Label>{t('selectChild')}</Label>
              {childrenLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <IconLoader2 className="size-4 animate-spin" />
                  {t('loadingChildren')}
                </div>
              ) : (
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectChildPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {children?.map((child) => (
                      <SelectItem key={child._id} value={child._id}>
                        {child.firstName && child.lastName
                          ? `${child.firstName} ${child.lastName}`
                          : child.username}
                      </SelectItem>
                    ))}
                    {children?.length === 0 ? (
                      <div className="text-muted-foreground px-3 py-2 text-sm">
                        {t('noChildren')}
                      </div>
                    ) : null}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || isLoading}>
            {isLoading ? <IconLoader2 className="size-4 animate-spin" /> : null}
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
