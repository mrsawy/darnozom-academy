'use client';

import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Label } from '@/components/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Switch } from '@/components/atoms/switch';
import { CreateUserFormData } from '@/lib/schema/user.schema';

interface PreferencesTabProps {
  // errors: FieldErrors<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
}

export default function PreferencesTab({ setValue, watch }: PreferencesTabProps) {
  const t = useTranslations('UserForm');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          {t('preferences.title')}
        </CardTitle>
        <CardDescription>{t('preferences.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language */}
        <div className="space-y-2">
          <Label>{t('preferences.language')}</Label>
          <Select
            defaultValue={watch('preferences.language') ?? 'en'}
            onValueChange={(v) => setValue('preferences.language', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('preferences.languageEn')}</SelectItem>
              <SelectItem value="ar">{t('preferences.languageAr')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">{t('preferences.emailNotifications')}</Label>
            <p className="text-muted-foreground text-sm">
              {t('preferences.emailNotificationsDesc')}
            </p>
          </div>
          <Switch
            checked={watch('preferences.emailNotifications') ?? true}
            onCheckedChange={(v) => setValue('preferences.emailNotifications', v)}
          />
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">{t('preferences.darkMode')}</Label>
            <p className="text-muted-foreground text-sm">{t('preferences.darkModeDesc')}</p>
          </div>
          <Switch
            checked={watch('preferences.darkMode') ?? false}
            onCheckedChange={(v) => setValue('preferences.darkMode', v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
