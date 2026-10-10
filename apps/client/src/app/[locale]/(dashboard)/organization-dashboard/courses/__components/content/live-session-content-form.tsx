'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { DateTimePicker } from '@/components/molecules/date-input/date-time-picker';
import { Calendar, Info } from 'lucide-react';
import {
  Controller,
  type Control,
  type UseFormRegister,
  FieldErrors,
  useWatch,
} from 'react-hook-form';

import { useTranslations } from 'next-intl';
import type { CourseContentFormData } from '@/lib/schema/content.schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Platform } from '@lms-organization/shared-types';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';

function getInitialLiveSessionProvider(initialValues?: CourseContentFormData): string | undefined {
  if (
    initialValues?.type !== CourseContentType.LIVE_SESSION ||
    initialValues.content == null ||
    !('startDate' in initialValues.content)
  ) {
    return undefined;
  }
  return (initialValues.content as { provider?: string }).provider;
}

interface LiveSessionContentErrors {
  provider?: { message?: string };
  meetingUrl?: { message?: string };
  platform?: { message?: string };
  startDate?: { message?: string };
  endDate?: { message?: string };
  durationInMinutes?: { message?: string };
  instructions?: { message?: string };
  recordedSession?: { message?: string };
}

interface LiveSessionContentFormProps {
  register: UseFormRegister<CourseContentFormData>;
  control: Control<CourseContentFormData>;
  errors?: FieldErrors<CourseContentFormData>;
  mode?: 'create' | 'edit';
  initialValues?: CourseContentFormData;
}

export default function LiveSessionContentForm({
  register,
  control,
  errors,
  mode = 'create',
  initialValues,
}: LiveSessionContentFormProps) {
  const t = useTranslations('CreateContentForm');
  const contentErrors = errors?.content as LiveSessionContentErrors | undefined;

  const provider = useWatch({ control, name: 'content.provider' }) as string | undefined;
  const isAgora = provider === 'AGORA' || getInitialLiveSessionProvider(initialValues) === 'AGORA';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          {t('liveSessionContent.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Controller
            control={control}
            name="content.startDate"
            render={({ field }) => (
              <DateTimePicker
                id="live-session-start-date"
                value={field.value}
                onChange={field.onChange}
                dateLabel={t('liveSessionContent.startDate')}
                timeLabel={null}
                error={contentErrors?.startDate ?? null}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Controller
            control={control}
            name="content.endDate"
            render={({ field }) => (
              <DateTimePicker
                id="live-session-end-date"
                value={field.value}
                onChange={field.onChange}
                dateLabel={t('liveSessionContent.endDate')}
                timeLabel={null}
                error={contentErrors?.endDate ?? null}
              />
            )}
          />
        </div>

        {/* Meeting provider selector — locked after creation */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('liveSessionContent.providerLabel')}</span>
          <Controller
            control={control}
            name="content.provider"
            render={({ field }) => (
              <Select
                value={field.value ?? 'EXTERNAL_URL'}
                onValueChange={field.onChange}
                disabled={mode === 'edit'}>
                <SelectTrigger className="w-full disabled:cursor-not-allowed disabled:opacity-60">
                  <SelectValue placeholder={t('liveSessionContent.providerLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXTERNAL_URL">
                    {t('liveSessionContent.providerExternalUrl')}
                  </SelectItem>
                  <SelectItem value="AGORA">{t('liveSessionContent.providerAgora')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {isAgora ? (
          <div className="bg-muted/40 flex items-start gap-2 rounded-lg border p-3">
            <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-muted-foreground text-sm">{t('liveSessionContent.agoraInfo')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('liveSessionContent.meetingUrl')}</span>
            <Input
              placeholder="https://..."
              {...register('content.meetingUrl')}
              aria-invalid={!!contentErrors?.meetingUrl}
            />
          </div>
        )}
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('liveSessionContent.instructions')}</span>
          <Textarea
            placeholder={t('liveSessionContent.instructionsPlaceholder')}
            rows={4}
            {...register('content.instructions')}
            aria-invalid={!!contentErrors?.instructions}
          />
          {contentErrors?.instructions?.message ? (
            <p className="text-sm text-red-600">{contentErrors.instructions.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('liveSessionContent.recordedSession')}</span>
          <Input
            placeholder="https://..."
            {...register('content.recordedSession')}
            aria-invalid={!!contentErrors?.recordedSession}
          />
          {contentErrors?.recordedSession?.message ? (
            <p className="text-sm text-red-600">{contentErrors.recordedSession.message}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!isAgora && (
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('liveSessionContent.platformLabel')}</span>
              <Controller
                control={control}
                name="content.platform"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-invalid={!!contentErrors?.platform}>
                      <SelectValue placeholder={t('liveSessionContent.platformLabel')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Platform)
                        .filter((p) => p !== Platform.AGORA)
                        .map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {t(`liveSessionContent.platform.${platform}`)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {contentErrors?.platform?.message ? (
                <p className="text-sm text-red-600">{contentErrors.platform.message}</p>
              ) : null}
            </div>
          )}
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('liveSessionContent.durationInMinutes')}</span>
            <Input
              type="number"
              min={0}
              {...register('content.durationInMinutes')}
              aria-invalid={!!contentErrors?.durationInMinutes}
            />
            {contentErrors?.durationInMinutes?.message ? (
              <p className="text-sm text-red-600">{contentErrors.durationInMinutes.message}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
