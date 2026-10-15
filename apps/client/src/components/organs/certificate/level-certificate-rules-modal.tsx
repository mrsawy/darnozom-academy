'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ICertificateRules } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import { useUpdateLevel } from '@/lib/hooks/academics/use-academics.hook';

interface LevelCertificateRulesModalProps {
  levelId: string;
  levelName: string;
  rules?: ICertificateRules;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LevelCertificateRulesModal({
  levelId,
  levelName,
  rules,
  open,
  onOpenChange,
}: LevelCertificateRulesModalProps) {
  const t = useTranslations('Certificates');
  const updateLevel = useUpdateLevel();

  const [minAttendancePercent, setMinAttendancePercent] = useState<string>(
    rules?.minAttendancePercent != null ? String(rules.minAttendancePercent) : ''
  );
  const [minHomeworkAverage, setMinHomeworkAverage] = useState<string>(
    rules?.minHomeworkAverage != null ? String(rules.minHomeworkAverage) : ''
  );
  const [requireExamPass, setRequireExamPass] = useState<boolean>(Boolean(rules?.requireExamPass));
  const [requireFullyPaid, setRequireFullyPaid] = useState<boolean>(
    Boolean(rules?.requireFullyPaid)
  );

  const handleSave = () => {
    const certificateRules: ICertificateRules = {
      minAttendancePercent: minAttendancePercent ? Number(minAttendancePercent) : undefined,
      minHomeworkAverage: minHomeworkAverage ? Number(minHomeworkAverage) : undefined,
      requireExamPass,
      requireFullyPaid,
    };

    updateLevel.mutate(
      {
        id: levelId,
        data: { certificateRules },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rules.title')}</DialogTitle>
          <DialogDescription>{t('rules.description', { name: levelName })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="min-attendance">{t('rules.minAttendancePercent')}</Label>
            <Input
              id="min-attendance"
              type="number"
              min={0}
              max={100}
              value={minAttendancePercent}
              onChange={(e) => setMinAttendancePercent(e.target.value)}
              placeholder="80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-homework">{t('rules.minHomeworkAverage')}</Label>
            <Input
              id="min-homework"
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={minHomeworkAverage}
              onChange={(e) => setMinHomeworkAverage(e.target.value)}
              placeholder="3.5"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-base">{t('rules.requireExamPass')}</Label>
              <p className="text-muted-foreground text-xs">{t('rules.requireExamPassHint')}</p>
            </div>
            <Switch checked={requireExamPass} onCheckedChange={setRequireExamPass} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-base">{t('rules.requireFullyPaid')}</Label>
              <p className="text-muted-foreground text-xs">{t('rules.requireFullyPaidHint')}</p>
            </div>
            <Switch checked={requireFullyPaid} onCheckedChange={setRequireFullyPaid} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={updateLevel.isPending}>
            {updateLevel.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
