'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Currency, SubscriptionType } from '@darnozom/shared-types';
import { parseMoney } from '@/lib/utils/billing/format-money';
import type { CreateSubscriptionFormValues } from '@/lib/types/billing/billing';

export interface SubscriptionFormProps {
  students: { _id: string; name: string }[];
  onSubmit: (data: CreateSubscriptionFormValues) => void;
  isSubmitting: boolean;
  defaultGroupId?: string;
}

export function SubscriptionForm({
  students,
  onSubmit,
  isSubmitting,
  defaultGroupId = '',
}: SubscriptionFormProps) {
  const t = useTranslations('Billing');
  const [type, setType] = useState<SubscriptionType>(SubscriptionType.MONTHLY);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(Currency.EGP);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isFamily = type === SubscriptionType.FAMILY;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedMinor = parseMoney(amount);
    if (parsedMinor === null) {
      setError(t('amountInvalid'));
      return;
    }

    if (selectedStudentIds.length === 0) {
      setError(t('studentRequired'));
      return;
    }

    onSubmit({
      type,
      amountMinor: parsedMinor,
      currency,
      items: selectedStudentIds.map((studentId) => ({
        studentId,
        groupId: defaultGroupId,
      })),
      note: note.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card text-card-foreground space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <label htmlFor="subscription-type" className="text-sm font-medium">
          {t('typeLabel')}
        </label>
        <select
          id="subscription-type"
          aria-label="type"
          className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={type}
          onChange={(e) => {
            const next = e.target.value as SubscriptionType;
            setType(next);
            if (next !== SubscriptionType.FAMILY && selectedStudentIds.length > 1) {
              setSelectedStudentIds(selectedStudentIds.slice(0, 1));
            }
          }}>
          {Object.values(SubscriptionType).map((val) => (
            <option key={val} value={val}>
              {t(`type.${val}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="subscription-students" className="text-sm font-medium">
          {isFamily ? t('students') : t('student')}
        </label>
        {isFamily ? (
          <select
            id="subscription-students"
            aria-label="students"
            multiple
            className="bg-background min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
            value={selectedStudentIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (option) => option.value);
              setSelectedStudentIds(selected);
            }}>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            id="subscription-students"
            aria-label="student"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={selectedStudentIds[0] ?? ''}
            onChange={(e) => setSelectedStudentIds(e.target.value ? [e.target.value] : [])}>
            <option value="">--</option>
            {students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="subscription-amount" className="text-sm font-medium">
            {t('amount')}
          </label>
          <input
            id="subscription-amount"
            aria-label="amount"
            type="text"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError(null);
            }}
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="subscription-currency" className="text-sm font-medium">
            {t('currency')}
          </label>
          <select
            id="subscription-currency"
            aria-label="currency"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}>
            {[...new Set(Object.values(Currency))].map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="subscription-note" className="text-sm font-medium">
          {t('note')}
        </label>
        <textarea
          id="subscription-note"
          aria-label="note"
          className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
        {t('save')}
      </button>
    </form>
  );
}
