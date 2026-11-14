'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { useMutation, useQueryClient } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/errors/getErrorMessage';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { createAgeRangeFromLevel } from '@/lib/actions/age-range/age-range.action';
import { useAgeRanges, ageRangeKeys } from '@/lib/hooks/age-range/use-age-ranges.hook';
import { AgeRangeFormDialog } from '@/app/[locale]/(dashboard)/main-admin-dashboard/age-ranges/__components/age-range-form-dialog/age-range-form-dialog';
import type { AgeRangeFormValues } from '@/app/[locale]/(dashboard)/main-admin-dashboard/age-ranges/__components/age-range-form-dialog/age-range-form-dialog.schema';

const NONE = '__none__';
const ADD_NEW = '__add_new__';

interface AgeRangeSelectProps {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Picks one of the platform age ranges (or none), or creates a new one inline. */
export function AgeRangeSelect({ value, onChange, disabled, id, className }: AgeRangeSelectProps) {
  const t = useTranslations('Academics');
  const tToasts = useTranslations('AdminAgeRanges.toasts');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: ageRanges = [] } = useAgeRanges();
  const [dialogOpen, setDialogOpen] = useState(false);

  const create = useMutation({
    mutationFn: (values: AgeRangeFormValues) => createAgeRangeFromLevel(values),
    onSuccess: async (created) => {
      toast.success(tToasts('created'));
      await queryClient.invalidateQueries({ queryKey: ageRangeKeys.all });
      setDialogOpen(false);
      onChange(created._id);
    },
    onError: (error: Error) => {
      const msg = getErrorMessage(error);
      toast.error(msg ? translateApiMessage(msg, tErrors) : tErrors('somethingWentWrong'));
    },
  });

  return (
    <>
      <Select
        value={value ?? NONE}
        onValueChange={(next) => {
          if (next === ADD_NEW) {
            setDialogOpen(true);
            return;
          }
          onChange(next === NONE ? null : next);
        }}
        disabled={disabled}>
        <SelectTrigger id={id} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('programs.ageRangeNone')}</SelectItem>
          {ageRanges.map((ageRange) => (
            <SelectItem key={ageRange._id} value={ageRange._id}>
              {locale === 'ar' ? ageRange.nameAr : ageRange.nameEn}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ADD_NEW}>{t('programs.ageRangeAddNew')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Portal events bubble through React parents; keep this form's submit from reaching an outer level form. */}
      <div onSubmit={(event) => event.stopPropagation()}>
        <AgeRangeFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={(values) => create.mutate(values)}
          isSubmitting={create.isPending}
        />
      </div>
    </>
  );
}
