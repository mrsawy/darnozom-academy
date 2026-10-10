'use client';

import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { platformOptionsSchema, type PlatformOptionsFormValues } from './platform-options.schema';
import type { OptionResponse } from '@/lib/actions/options/options.action';

interface PlatformOptionsFormProps {
  options: OptionResponse[];
  onSubmit: (values: PlatformOptionsFormValues) => void;
  isSubmitting: boolean;
}

const GENERAL_FIELDS: (keyof PlatformOptionsFormValues)[] = [
  'PLATFORM_NAME',
  'PLATFORM_LOGO_URL',
  'PLATFORM_WEBSITE_URL',
];

const CONTACT_FIELDS: (keyof PlatformOptionsFormValues)[] = [
  'PLATFORM_EMAIL',
  'PLATFORM_SUPPORT_EMAIL',
  'PLATFORM_PHONE',
];

const LEGAL_FIELDS: (keyof PlatformOptionsFormValues)[] = [
  'PLATFORM_TERMS_URL',
  'PLATFORM_PRIVACY_URL',
];

const FIELD_INPUT_TYPES: Partial<Record<keyof PlatformOptionsFormValues, string>> = {
  PLATFORM_EMAIL: 'email',
  PLATFORM_SUPPORT_EMAIL: 'email',
  PLATFORM_LOGO_URL: 'url',
  PLATFORM_WEBSITE_URL: 'url',
  PLATFORM_TERMS_URL: 'url',
  PLATFORM_PRIVACY_URL: 'url',
  PLATFORM_PHONE: 'tel',
};

function buildInitialValues(options: OptionResponse[]): PlatformOptionsFormValues {
  const map: Record<string, string> = {};
  for (const opt of options) {
    if (typeof opt.value === 'string') {
      map[opt.key] = opt.value;
    }
  }
  return {
    PLATFORM_NAME: map.PLATFORM_NAME ?? '',
    PLATFORM_EMAIL: map.PLATFORM_EMAIL ?? '',
    PLATFORM_SUPPORT_EMAIL: map.PLATFORM_SUPPORT_EMAIL ?? '',
    PLATFORM_LOGO_URL: map.PLATFORM_LOGO_URL ?? '',
    PLATFORM_WEBSITE_URL: map.PLATFORM_WEBSITE_URL ?? '',
    PLATFORM_PHONE: map.PLATFORM_PHONE ?? '',
    PLATFORM_TERMS_URL: map.PLATFORM_TERMS_URL ?? '',
    PLATFORM_PRIVACY_URL: map.PLATFORM_PRIVACY_URL ?? '',
  };
}

export function PlatformOptionsForm({ options, onSubmit, isSubmitting }: PlatformOptionsFormProps) {
  const t = useTranslations('AdminPlatformOptions');
  const tFields = useTranslations('AdminPlatformOptions.fields');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlatformOptionsFormValues>({
    resolver: yupResolver(platformOptionsSchema) as Resolver<PlatformOptionsFormValues>,
    defaultValues: buildInitialValues(options),
  });

  useEffect(() => {
    reset(buildInitialValues(options));
  }, [options, reset]);

  const renderField = (key: keyof PlatformOptionsFormValues) => {
    const fieldKey = key as string;
    const inputType = FIELD_INPUT_TYPES[key] ?? 'text';

    const camelKey = fieldKey
      .toLowerCase()
      .replaceAll(/_([a-z])/g, (_, l: string) => l.toUpperCase());

    return (
      <div key={fieldKey} className="space-y-1">
        <Label htmlFor={fieldKey}>{tFields(`${camelKey}`)}</Label>
        <Input
          id={fieldKey}
          type={inputType}
          placeholder={tFields(`${camelKey}Placeholder`)}
          {...register(key)}
        />
        {errors[key] ? <p className="text-destructive text-xs">{errors[key]?.message}</p> : null}
      </div>
    );
  };

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-8">
      {/* General */}
      <section className="space-y-4">
        <h2 className="border-b pb-1 text-base font-semibold">{t('sections.general')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GENERAL_FIELDS.map(renderField)}
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="border-b pb-1 text-base font-semibold">{t('sections.contact')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CONTACT_FIELDS.map(renderField)}
        </div>
      </section>

      {/* Legal */}
      <section className="space-y-4">
        <h2 className="border-b pb-1 text-base font-semibold">{t('sections.legal')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{LEGAL_FIELDS.map(renderField)}</div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveAll')
          )}
        </Button>
      </div>
    </form>
  );
}
