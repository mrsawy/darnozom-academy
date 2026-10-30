'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useCreateCustomPaymentMethodConfig,
  usePaymentMethodConfigs,
  useSetPaymentMethodConfigEnabled,
  useUpsertPaymentMethodConfigFields,
} from '@/lib/hooks/billing/use-billing.hook';
import type { IPaymentMethodConfig, IPaymentMethodField, PaymentMethodFieldType } from '@/lib/types/billing/payment-method-config';

const FIELD_TYPES: PaymentMethodFieldType[] = ['TEXT', 'IMAGE', 'LINK'];

function FieldEditor({ config }: { config: IPaymentMethodConfig }) {
  const t = useTranslations('Billing');
  const upsertFields = useUpsertPaymentMethodConfigFields();
  const [fields, setFields] = useState<IPaymentMethodField[]>(config.fields);

  const updateField = (index: number, patch: Partial<IPaymentMethodField>) => {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addField = () => {
    setFields((prev) => [...prev, { key: `field_${prev.length}`, label: '', type: 'TEXT', value: '', order: prev.length }]);
  };

  const save = () => {
    upsertFields.mutate({
      configId: config._id,
      fields: fields.map((field) => ({ label: field.label, type: field.type, value: field.value })),
    });
  };

  return (
    <div className="space-y-2 pt-2">
      {fields.map((field, index) => (
        <div key={field.key} className="flex items-center gap-2">
          <input
            aria-label="fieldLabel"
            className="bg-background rounded-md border px-2 py-1 text-sm"
            value={field.label}
            onChange={(e) => updateField(index, { label: e.target.value })}
          />
          <select
            aria-label="fieldType"
            className="bg-background rounded-md border px-2 py-1 text-sm"
            value={field.type}
            onChange={(e) => updateField(index, { type: e.target.value as PaymentMethodFieldType })}>
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            aria-label="fieldValue"
            className="bg-background rounded-md border px-2 py-1 text-sm"
            value={field.value}
            onChange={(e) => updateField(index, { value: e.target.value })}
          />
          <button type="button" onClick={() => removeField(index)} className="text-destructive text-xs">
            {t('remove')}
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={addField} className="bg-muted rounded-md px-3 py-1.5 text-sm">
          {t('addField')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={upsertFields.isPending}
          className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm">
          {t('save')}
        </button>
      </div>
    </div>
  );
}

function MethodRow({ config }: { config: IPaymentMethodConfig }) {
  const t = useTranslations('Billing');
  const setEnabled = useSetPaymentMethodConfigEnabled();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setEnabled.mutate({ configId: config._id, enabled: e.target.checked })}
          />
          {config.label}
        </label>
        <button type="button" onClick={() => setExpanded((prev) => !prev)} className="text-primary text-xs underline">
          {t('editFields')}
        </button>
      </div>
      {expanded ? <FieldEditor config={config} /> : null}
    </div>
  );
}

function AddMethodForm() {
  const t = useTranslations('Billing');
  const createCustom = useCreateCustomPaymentMethodConfig();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="bg-muted rounded-md px-3 py-1.5 text-sm">
        {t('addMethod')}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        aria-label="newMethodLabel"
        className="bg-background rounded-md border px-2 py-1 text-sm"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button
        type="button"
        disabled={createCustom.isPending}
        onClick={() => {
          createCustom.mutate({ label, fields: [] });
          setLabel('');
          setOpen(false);
        }}
        className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm">
        {t('createMethod')}
      </button>
    </div>
  );
}

export function PaymentMethodConfigManager() {
  const t = useTranslations('Billing');
  const { data: configs = [], isLoading } = usePaymentMethodConfigs();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t('paymentMethods')}</h3>
      {isLoading ? <p className="text-muted-foreground text-sm">{t('loading')}</p> : null}
      {configs.map((config) => (
        <MethodRow key={config._id} config={config} />
      ))}
      <AddMethodForm />
    </div>
  );
}
