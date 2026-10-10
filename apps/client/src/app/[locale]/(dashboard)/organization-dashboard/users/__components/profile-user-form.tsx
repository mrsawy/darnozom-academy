import { Button } from '@/components/atoms/button';
import { Calendar } from '@/components/atoms/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Textarea } from '@/components/atoms/textarea';
import DropzoneWithPreview from '@/components/molecules/dropzone-preview';
import { CreateUserFormData } from '@/lib/schema/user.schema';
import { IUser } from '@/lib/types/user/user.interface';
import { ChevronDownIcon } from 'lucide-react';
import React, { useState } from 'react';
import { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch, Path } from 'react-hook-form';
import { useTranslations } from 'next-intl';

interface ProfileUserFormProps {
  errors: FieldErrors<CreateUserFormData>;
  register: UseFormRegister<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
  mode: 'edit' | 'create';
  initialUser: IUser | null;
}

export default function ProfileUserForm({
  register,
  setValue,
  watch,
  mode,
  initialUser,
}: ProfileUserFormProps) {
  const t = useTranslations('ProfileUserForm');
  const [open, setOpen] = React.useState(false);

  const isUpdateMode = mode === 'edit';
  const [files, setFiles] = useState<File[] | undefined>();
  const [filePreview, setFilePreview] = useState<string | undefined>(
    isUpdateMode ? initialUser?.profile?.avatar : undefined
  );

  const dateOfBirth = watch('profile.dateOfBirth');

  const handleDrop = (droppedFiles: File[]) => {
    setFiles(droppedFiles);
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      setValue(
        'profile.avatarFile' as Path<CreateUserFormData>,
        file as unknown as CreateUserFormData['profile'],
        { shouldValidate: true }
      );

      const reader = new FileReader();
      reader.addEventListener('load', (e) => {
        if (typeof e.target?.result === 'string') {
          setFilePreview(e.target?.result);
        }
      });
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profileInformation')}</CardTitle>
        <CardDescription>{t('additionalProfileDetails')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bio */}
        <div className="space-y-2">
          <label htmlFor="profile-bio" className="text-sm font-medium">
            {t('bio')}
          </label>
          <Textarea
            id="profile-bio"
            {...register('profile.bio')}
            placeholder={t('bioPlaceholder')}
            rows={4}
            className="w-full"
          />
        </div>

        {/* Short Bio */}
        <div className="space-y-2">
          <label htmlFor="profile-shortBio" className="text-sm font-medium">
            {t('shortBio')}
          </label>
          <Input
            id="profile-shortBio"
            {...register('profile.shortBio')}
            placeholder={t('shortBioPlaceholder')}
            className="w-full"
          />
        </div>

        {/* Avatar URL */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('uploadAvatar')}</span>
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
        <div className="relative space-y-2">
          <div className="flex flex-col gap-3">
            <Label htmlFor="date" className="px-1">
              {t('dateOfBirth')}
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" id="date" className="w-full justify-between font-normal">
                  {dateOfBirth ? dateOfBirth.toLocaleDateString() : t('selectDate')}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="m-auto w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfBirth}
                  captionLayout="dropdown"
                  onSelect={(selectedDate) => {
                    setValue('profile.dateOfBirth', selectedDate);
                    setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('address')}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input {...register('profile.address.street')} placeholder={t('streetAddress')} />
            <Input {...register('profile.address.city')} placeholder={t('city')} />
            <Input {...register('profile.address.state')} placeholder={t('stateProvince')} />
            <Input {...register('profile.address.zipCode')} placeholder={t('zipPostalCode')} />
            <div className="md:col-span-2">
              <Input {...register('profile.address.country')} placeholder={t('country')} />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('socialLinks')}</h3>
          <div className="space-y-4">
            <Input {...register('profile.socialLinks.linkedin')} placeholder={t('linkedinUrl')} />
            <Input {...register('profile.socialLinks.twitter')} placeholder={t('twitterUrl')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
