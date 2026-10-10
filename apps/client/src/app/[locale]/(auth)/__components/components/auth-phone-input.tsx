'use client';

import * as React from 'react';
import { PhoneInput } from '@/components/organs/phone-input';
import { cn } from '@/lib/utils';

export interface AuthPhoneInputProps {
  onValueChange: (value: string) => void;
  error?: string;
  className?: string;
  name?: string;
  value?: string;
}

export function AuthPhoneInput({
  onValueChange,
  error,
  className,
  name,
  value,
}: AuthPhoneInputProps): React.ReactElement {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <PhoneInput className="w-full" name={name} value={value} onValueChange={onValueChange} />
      {error ? <p className="text-left text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
