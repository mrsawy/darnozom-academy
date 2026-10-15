'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Currency, TeacherPayModel } from '@darnozom/shared-types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { useUpsertPayProfile } from '@/lib/hooks/payroll/use-payroll.hook';
import type { ITeacherPayProfile } from '@/lib/types/payroll/payroll';

export interface PayProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: ITeacherPayProfile | null;
}

export function PayProfileDialog({
  open,
  onOpenChange,
  profile,
}: PayProfileDialogProps) {
  const t = useTranslations('Payroll');
  const upsert = useUpsertPayProfile();

  const [teacherId, setTeacherId] = useState('');
  const [model, setModel] = useState<TeacherPayModel>(TeacherPayModel.PER_SESSION);
  const [rate, setRate] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>(Currency.SAR);
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (profile) {
      setTeacherId(profile.teacherId);
      setModel(profile.model);
      setRate(profile.rate);
      setCurrency(profile.currency);
      setEffectiveFrom(
        new Date(profile.effectiveFrom).toISOString().slice(0, 10)
      );
    } else {
      setTeacherId('');
      setModel(TeacherPayModel.PER_SESSION);
      setRate(0);
      setCurrency(Currency.SAR);
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
    }
  }, [profile, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId.trim() || rate < 0) return;

    await upsert.mutateAsync({
      teacherId: teacherId.trim(),
      model,
      rate,
      currency,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
    });

    onOpenChange(false);
  };

  const isRevenueShare = model === TeacherPayModel.REVENUE_SHARE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {profile ? t('editProfile') : t('addProfile')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacherId">{t('teacher')} ID</Label>
            <Input
              id="teacherId"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              placeholder="e.g. 64b8f... or user ID"
              disabled={Boolean(profile)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">{t('payModel')}</Label>
            <Select
              value={model}
              onValueChange={(val) => setModel(val as TeacherPayModel)}
            >
              <SelectTrigger id="model">
                <SelectValue placeholder={t('payModel')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TeacherPayModel).map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`models.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">
                {t('rate')} {isRevenueShare ? '(%)' : ''}
              </Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max={isRevenueShare ? '100' : undefined}
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t('currency')}</Label>
              <Select
                value={currency}
                onValueChange={(val) => setCurrency(val as Currency)}
                disabled={isRevenueShare}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder={t('currency')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Currency).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveFrom">{t('effectiveFrom')}</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
