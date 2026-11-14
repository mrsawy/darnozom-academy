'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Currency, GroupPayModel } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { useUpsertGroupPayRule } from '@/lib/hooks/payroll/use-payroll.hook';
import type { IGroupPayRule, IPayrollLookup } from '@/lib/types/payroll/payroll';
import { groupPayRuleSchema } from './group-pay-rule-dialog.schema';

export interface GroupPayRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookup?: IPayrollLookup;
  /** The rule being edited; null/undefined to set a rule for a group that has none. */
  rule?: IGroupPayRule | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function GroupPayRuleDialog({ open, onOpenChange, lookup, rule }: GroupPayRuleDialogProps) {
  const t = useTranslations('Payroll');
  const upsert = useUpsertGroupPayRule();

  const [groupId, setGroupId] = useState('');
  const [model, setModel] = useState<GroupPayModel>(GroupPayModel.FIXED_PER_GROUP);
  const [rate, setRate] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.SAR);
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setInvalid(false);
    if (rule) {
      setGroupId(rule.groupId);
      setModel(rule.model);
      setRate(String(rule.rate));
      setCurrency(rule.currency);
    } else {
      setGroupId('');
      setModel(GroupPayModel.FIXED_PER_GROUP);
      setRate('');
      setCurrency(Currency.SAR);
    }
    setEffectiveFrom(today());
  }, [rule, open]);

  const groups = lookup?.groups ?? [];
  const group = groups.find((g) => g.id === groupId);
  const teacherName = lookup?.teachers.find((x) => x.id === group?.teacherId)?.name;
  const isPercent = model === GroupPayModel.PERCENT_OF_SUBSCRIPTIONS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = groupPayRuleSchema.isValidSync({
      groupId,
      model,
      rate: rate === '' ? Number.NaN : Number(rate),
      currency,
      effectiveFrom,
    });
    const teacherId = rule?.teacherId ?? group?.teacherId;
    if (!parsed || !teacherId) {
      setInvalid(true);
      return;
    }
    await upsert.mutateAsync({
      teacherId,
      groupId,
      model,
      rate: Number(rate),
      currency,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? t('editRule') : t('addRule')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-group">{t('group')}</Label>
            <Select value={groupId} onValueChange={setGroupId} disabled={Boolean(rule)}>
              <SelectTrigger id="rule-group">
                <SelectValue placeholder={t('selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                {groups.length === 0 ? (
                  <div className="text-muted-foreground p-2 text-sm">
                    {t('noGroupsWithTeacher')}
                  </div>
                ) : (
                  groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {teacherName ? (
              <p className="text-muted-foreground text-xs">
                {t('groupTeacher')}: <span className="font-medium">{teacherName}</span>
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-model">{t('payModel')}</Label>
            <Select value={model} onValueChange={(v) => setModel(v as GroupPayModel)}>
              <SelectTrigger id="rule-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(GroupPayModel).map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`groupModels.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{t(`groupModelHints.${model}`)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-rate">{isPercent ? t('ratePercent') : t('rateAmount')}</Label>
              <Input
                id="rule-rate"
                type="number"
                step="0.01"
                min="0"
                max={isPercent ? '100' : undefined}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-currency">{t('currency')}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger id="rule-currency">
                  <SelectValue />
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
            <Label htmlFor="rule-effective">{t('effectiveFrom')}</Label>
            <Input
              id="rule-effective"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
            />
          </div>

          {invalid ? <p className="text-destructive text-sm">{t('invalidRule')}</p> : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
