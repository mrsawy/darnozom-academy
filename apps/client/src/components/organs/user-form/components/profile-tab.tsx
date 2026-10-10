'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FieldErrors, Path, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Calendar } from '@/components/atoms/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Textarea } from '@/components/atoms/textarea';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { CreateUserFormData } from '@/lib/schema/user.schema';
import type { IUser } from '@/lib/types/user/user.interface';
import type { UserFormMode } from '../user-form';

const SOCIAL_LINK_KEYS = [
  'linkedin',
  'twitter',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'website',
  'other',
] as const;

interface ProfileTabProps {
  errors: FieldErrors<CreateUserFormData>;
  register: UseFormRegister<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
  mode: UserFormMode;
  initialUser: IUser | null;
}

export default function ProfileTab({
  register,
  setValue,
  watch,
  mode,
  initialUser,
}: ProfileTabProps) {
  const t = useTranslations('UserForm');
  const [open, setOpen] = React.useState(false);
  const [files, setFiles] = useState<File[] | undefined>();
  const [filePreview, setFilePreview] = useState<string | undefined>(
    mode === 'create' ? undefined : (initialUser?.profile?.avatar ?? undefined)
  );

  const dateOfBirth = watch('profile.dateOfBirth');

  const handleDrop = (droppedFiles: File[]) => {
    setFiles(droppedFiles);
    if (droppedFiles.length === 0) return;
    const file = droppedFiles[0];
    setValue(
      'profile.avatarFile' as Path<CreateUserFormData>,
      file as unknown as CreateUserFormData['profile'],
      { shouldValidate: true }
    );
    const reader = new FileReader();
    reader.addEventListener('load', (e) => {
      if (typeof e.target?.result === 'string') setFilePreview(e.target.result);
    });
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.title')}</CardTitle>
        <CardDescription>{t('profile.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bio */}
        <div className="space-y-2">
          <label htmlFor="profile-bio" className="text-sm font-medium">
            {t('profile.bio')}
          </label>
          <Textarea
            id="profile-bio"
            {...register('profile.bio')}
            placeholder={t('profile.bioPlaceholder')}
            rows={4}
            className="w-full"
          />
        </div>

        {/* Short Bio */}
        <div className="space-y-2">
          <label htmlFor="profile-shortBio" className="text-sm font-medium">
            {t('profile.shortBio')}
          </label>
          <Input
            id="profile-shortBio"
            {...register('profile.shortBio')}
            placeholder={t('profile.shortBioPlaceholder')}
            className="w-full"
          />
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('profile.avatar')}</span>
          <p className="text-muted-foreground text-xs">{t('profile.avatarHint')}</p>
          <DropzoneWithPreview
            filePreview={filePreview}
            handleDrop={handleDrop}
            files={files}
            className="size-50 md:h-60 md:w-80"
            accept={{ 'image/*': [] }}
            maxFiles={1}
          />
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="dateOfBirth" className="px-1">
            {t('profile.dateOfBirth')}
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="dateOfBirth"
                className="w-full justify-between font-normal">
                {dateOfBirth ? dateOfBirth.toLocaleDateString() : t('profile.selectDate')}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="m-auto w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfBirth}
                captionLayout="dropdown"
                onSelect={(selected) => {
                  setValue('profile.dateOfBirth', selected);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('profile.address')}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input {...register('profile.address.street')} placeholder={t('profile.street')} />
            <Input {...register('profile.address.city')} placeholder={t('profile.city')} />
            <Input {...register('profile.address.state')} placeholder={t('profile.state')} />
            <Input {...register('profile.address.zipCode')} placeholder={t('profile.zipCode')} />
            <div className="md:col-span-2">
              <Input {...register('profile.address.country')} placeholder={t('profile.country')} />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('profile.socialLinks')}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SOCIAL_LINK_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`profile-social-${key}`}>
                  {t(`profile.socialPlatforms.${key}`)}
                </Label>
                <Input
                  id={`profile-social-${key}`}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  {...register(`profile.socialLinks.${key}`)}
                  placeholder={t('profile.socialUrlPlaceholder')}
                  dir="ltr"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
