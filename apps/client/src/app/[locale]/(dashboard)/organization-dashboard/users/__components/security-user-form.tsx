import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { CreateUserFormData } from '@/lib/schema/user.schema';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch, Path } from 'react-hook-form';

interface SecurityUserFormProps {
  errors: FieldErrors<CreateUserFormData>;
  register: UseFormRegister<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
  mode: 'create' | 'edit';
}

export default function SecurityUserForm({ errors, register, mode }: SecurityUserFormProps) {
  const t = useTranslations('SecurityUserForm');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          {t('securitySettings')}
        </CardTitle>
        <CardDescription>
          {mode === 'edit' ? t('updatePasswordSecurity') : t('setPasswordSecurity')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <>
          {mode === 'edit' && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">{t('passwordNote')}</p>
            </div>
          )}
          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('password')} *
            </label>
            <div className="relative">
              <Input
                id="password"
                {...register('password' as Path<CreateUserFormData>)}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('passwordPlaceholder')}
                className="w-full pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="text-sm text-red-600">{errors?.password?.message}</p>
            ) : null}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('confirmPassword')} *
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('confirmPasswordPlaceholder')}
                className="w-full pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
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
        </>
      </CardContent>
    </Card>
  );
}
