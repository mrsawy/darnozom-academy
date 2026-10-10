'use client';

import * as React from 'react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface AuthPasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'className' | 'type'> {
  label: string;
  htmlFor?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
}

export const AuthPasswordInput = React.forwardRef<HTMLInputElement, AuthPasswordInputProps>(
  ({ label, htmlFor, placeholder, error, className, inputClassName, ...inputProps }, ref) => {
    const t = useTranslations('AuthPasswordInput');
    const [showPassword, setShowPassword] = useState(false);
    const id = htmlFor ?? inputProps.name ?? inputProps.id;

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="flex flex-col items-start">
          <Label className="lg:text-medium text-sm" htmlFor={id}>
            {label}
          </Label>
        </div>
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            type={showPassword ? 'text' : 'password'}
            placeholder={placeholder}
            className={cn(
              'lg:placeholder:text-medium lg:text-medium pr-10 text-sm placeholder:text-sm',
              inputClassName
            )}
            aria-invalid={!!error}
            {...inputProps}
          />
          <button
            type="button"
            className="absolute top-1/2 right-3 -translate-y-1/2"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            tabIndex={-1}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? <p className="text-left text-sm text-red-400">{error}</p> : null}
      </div>
    );
  }
);

AuthPasswordInput.displayName = 'AuthPasswordInput';
