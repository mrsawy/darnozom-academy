'use client';

import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import { CreateCourseSchema } from '@/lib/schema/course.schema';
import {
  FieldErrors,
  Path,
  PathValue,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Settings2 } from 'lucide-react';
import { CourseFormSection } from './course-form-section';

interface CourseSettingsSectionProps {
  register: UseFormRegister<CreateCourseSchema>;
  watch: UseFormWatch<CreateCourseSchema>;
  setValue: UseFormSetValue<CreateCourseSchema>;
  errors: FieldErrors<CreateCourseSchema>;
}

export function CourseSettingsSection({
  register,
  watch,
  setValue,
  errors,
}: CourseSettingsSectionProps) {
  const t = useTranslations('CourseForm');

  return (
    <CourseFormSection
      title={t('courseSettings')}
      description={t('courseSettingsHelp')}
      icon={Settings2}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="bg-muted/20 hover:bg-muted/40 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors">
          <span className="text-sm font-medium">{t('enableDiscussions')}</span>
          <Switch
            id="discussionEnabled"
            checked={watch('settings')?.discussionEnabled ?? false}
            onCheckedChange={(checked) => {
              const currentSettings = watch('settings') ?? {};
              setValue('settings', {
                ...currentSettings,
                discussionEnabled: checked,
              } as PathValue<CreateCourseSchema, 'settings'>);
            }}
          />
        </label>

        <div className="bg-muted/20 flex flex-col justify-center gap-1.5 rounded-lg border px-4 py-3">
          <Label htmlFor="enrollmentLimit" className="text-sm font-medium">
            {t('enrollmentLimit')}
          </Label>
          <Input
            id="enrollmentLimit"
            type="number"
            placeholder={t('noLimit')}
            {...register('settings.enrollmentLimit' as Path<CreateCourseSchema>, {
              valueAsNumber: true,
            })}
          />
          {errors.settings?.enrollmentLimit ? (
            <p className="text-destructive text-sm">{errors.settings.enrollmentLimit.message}</p>
          ) : null}
        </div>
      </div>
    </CourseFormSection>
  );
}
