'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { FieldErrors, Path, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { CreateUserFormData } from '@/lib/schema/user.schema';
import type { UserFormMode } from '../user-form';

interface SecurityTabProps {
  errors: FieldErrors<CreateUserFormData>;
  register: UseFormRegister<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
  mode: UserFormMode;
}

export default function SecurityTab({ errors, register, mode }: SecurityTabProps) {
  const t = useTranslations('UserForm');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isOptional = mode === 'edit' || mode === 'self';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          {t('security.title')}
        </CardTitle>
        <CardDescription>
          {mode === 'create' ? t('security.descriptionCreate') : t('security.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isOptional ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">{t('security.editHint')}</p>
          </div>
        ) : null}

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t('security.password')} {!isOptional && '*'}
          </label>
          <div className="relative">
            <Input
              id="password"
              {...register('password' as Path<CreateUserFormData>)}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('security.passwordPlaceholder')}
              className="w-full pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowPassword((p) => !p)}>
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          ) : null}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            {t('security.confirmPassword')} {!isOptional && '*'}
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              {...register('confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              placeholder={t('security.confirmPasswordPlaceholder')}
              className="w-full pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowConfirm((p) => !p)}>
              {showConfirm ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
