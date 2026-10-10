'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/components/atoms/input';
import { Combobox } from '@/components/molecules/combobox';
import { countryCodes } from '@/lib/data/countryCodes';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  defaultCode?: { value: string; label: string };
  onValueChange?: (value: string) => void;
  value?: string;
  name?: string;
}

const DEFAULT_CODE = { value: '+20', label: '🇪🇬 +20' };
export function PhoneInput({
  label,
  defaultCode = DEFAULT_CODE,
  onValueChange,
  value = '',
  name,
  className,
  ...props
}: PhoneInputProps): React.ReactElement {
  const locale = useLocale();
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(locale === 'ar' ? 'rtl' : 'ltr');
  const t = useTranslations('PhoneInput');
  const displayLabel = label ?? t('label');
  // Parse the incoming value to extract country code and phone number
  const parsePhoneValue = useCallback(
    (fullPhone: string) => {
      if (!fullPhone) return { code: defaultCode.value, number: '' };

      // Find matching country code from the start of the phone number
      const matchingCode = countryCodes.find((cc) =>
        fullPhone.startsWith(cc.value.replaceAll('+', ''))
      );

      if (matchingCode) {
        const codeLength = matchingCode.value.replaceAll('+', '').length;
        const number = fullPhone.slice(Math.max(0, codeLength)).replaceAll(/\D/g, '');
        return { code: matchingCode.value, number };
      }

      return { code: defaultCode.value, number: fullPhone.replaceAll(/\D/g, '') };
    },
    [defaultCode.value]
  );

  const { code: initialCode, number: initialNumber } = parsePhoneValue(value);

  const [countryCode, setCountryCode] = useState(initialCode);
  const [phone, setPhone] = useState(initialNumber);

  useEffect(() => {
    setDirection(locale === 'ar' ? (phone ? 'ltr' : 'rtl') : 'ltr');
  }, [phone, locale]);

  // Update internal state when value prop changes (for form rehydration)
  useEffect(() => {
    const { code, number } = parsePhoneValue(value);
    setCountryCode(code);
    setPhone(number);
  }, [value, parsePhoneValue]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const newPhone = raw.replaceAll(/\D/g, '');
    setPhone(newPhone);

    // Immediately notify parent
    if (onValueChange) {
      const fullPhone = newPhone ? `${countryCode}${newPhone}` : '';
      const normalized = fullPhone.replaceAll(/^\+/g, '').trim();
      onValueChange(normalized);
    }
  };

  const handleCountryCodeChange = (code: string) => {
    setCountryCode(code);

    // Immediately notify parent
    if (onValueChange) {
      const fullPhone = phone ? `${code}${phone}` : '';
      const normalized = fullPhone.replaceAll(/^\+/g, '').trim();
      onValueChange(normalized);
    }
  };

  return (
    <div className={cn('flex flex-col justify-between gap-1', className)} {...props}>
      {displayLabel ? <label className="text-sm font-medium">{displayLabel}</label> : null}
      <div className="flex [direction:ltr]">
        <Combobox
          title={t('selectTitle')}
          data={countryCodes}
          onValueChange={handleCountryCodeChange}
          value={countryCode}
          defaultValue={defaultCode}
          buttonClassName="w-[90px] placeholder:text-sm lg:placeholder:text-md text-sm lg:text-md h-9"
          contentClassName="w-[180px]"
          placeholder={t('searchPlaceholder')}
          buttonStyles={{ borderEndEndRadius: 0, borderStartEndRadius: 0 }}
        />
        <Input
          dir={direction}
          type="tel"
          placeholder={t('placeholder')}
          value={phone}
          onChange={handlePhoneChange}
          name={name}
          className="phone-input-number lg:placeholder:text-md h-9 flex-1 text-sm placeholder:text-sm lg:text-base"
          style={{ borderStartStartRadius: 0, borderEndStartRadius: 0 }}
        />
      </div>
    </div>
  );
}
