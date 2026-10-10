'use client';

import * as React from 'react';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { cn } from '@/lib/utils';

export interface AuthTextInputProps extends Omit<React.ComponentProps<typeof Input>, 'className'> {
  label: string;
  htmlFor?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  /** Use LTR for email/username so content displays left-to-right */
}

export const AuthTextInput = React.forwardRef<HTMLInputElement, AuthTextInputProps>(
  ({ label, htmlFor, placeholder, error, className, inputClassName, ...inputProps }, ref) => {
    const id = htmlFor ?? inputProps.name ?? inputProps.id;
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Label className="lg:text-medium text-sm" htmlFor={id}>
          {label}
        </Label>
        <Input
          ref={ref}
          id={id}
          placeholder={placeholder}
          className={cn(
            'lg:placeholder:text-medium lg:text-medium text-sm placeholder:text-sm',
            inputClassName
          )}
          aria-invalid={!!error}
          {...inputProps}
        />
        {error ? <p className="text-left text-sm text-red-400">{error}</p> : null}
      </div>
    );
  }
);

AuthTextInput.displayName = 'AuthTextInput';
