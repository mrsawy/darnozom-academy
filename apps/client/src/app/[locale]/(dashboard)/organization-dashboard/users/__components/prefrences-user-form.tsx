import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { CreateUserFormData } from '@/lib/schema/user.schema';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';

interface PreferencesUserFormProps {
  errors: FieldErrors<CreateUserFormData>;
  setValue: UseFormSetValue<CreateUserFormData>;
  watch: UseFormWatch<CreateUserFormData>;
}

export default function PreferencesUserForm({ errors, setValue, watch }: PreferencesUserFormProps) {
  const t = useTranslations('PrefrencesUserForm');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('language')}</span>
          <Select
            onValueChange={(value) => setValue('preferences.language', value)}
            defaultValue="en">
            <SelectTrigger>
              <SelectValue placeholder={t('selectLanguage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('languages.en')}</SelectItem>
              <SelectItem value="es">{t('languages.es')}</SelectItem>
              <SelectItem value="fr">{t('languages.fr')}</SelectItem>
              <SelectItem value="de">{t('languages.de')}</SelectItem>
              <SelectItem value="it">{t('languages.it')}</SelectItem>
            </SelectContent>
          </Select>
          {errors.preferences?.language ? (
            <p className="text-sm text-red-600">{errors.preferences.language.message}</p>
          ) : null}
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{t('emailNotifications')}</span>
            <p className="text-muted-foreground text-xs">{t('emailNotificationsHint')}</p>
          </div>
          <Button
            type="button"
            variant={watch('preferences.emailNotifications') ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setValue('preferences.emailNotifications', !watch('preferences.emailNotifications'))
            }>
            {watch('preferences.emailNotifications') ? t('enabled') : t('disabled')}
          </Button>
        </div>
        {errors.preferences?.emailNotifications ? (
          <p className="text-sm text-red-600">{errors.preferences.emailNotifications.message}</p>
        ) : null}

        {/* Dark Mode */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{t('darkMode')}</span>
            <p className="text-muted-foreground text-xs">{t('darkModeHint')}</p>
          </div>
          <Button
            type="button"
            variant={watch('preferences.darkMode') ? 'default' : 'outline'}
            size="sm"
            onClick={() => setValue('preferences.darkMode', !watch('preferences.darkMode'))}>
            {watch('preferences.darkMode') ? t('dark') : t('light')}
          </Button>
        </div>
        {errors.preferences?.darkMode ? (
          <p className="text-sm text-red-600">{errors.preferences.darkMode.message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
