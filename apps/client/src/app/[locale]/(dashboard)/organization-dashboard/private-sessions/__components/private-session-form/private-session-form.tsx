'use client';

import { useMemo } from 'react';
import { FieldErrors, useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import { Switch } from '@/components/atoms/switch';
import { Label } from '@/components/atoms/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { ROUTE_ORG_PRIVATE_SESSIONS } from '@/lib/data/constants/routes.constants';
import {
  createPrivateSession,
  updatePrivateSession,
} from '@/lib/actions/private-sessions/private-sessions.action';
import {
  buildPrivateSessionSchema,
  formatSlotTimeForApi,
  type PrivateSessionFormValues,
} from './private-session-form.schema';
import {
  SessionType,
  type IPrivateSession,
} from '@/lib/types/private-session/private-session.interface';
import { isNatsErrResult } from '@/lib/utils/natsErrorHandler';
import {
  getBrowserTimeZone,
  instantToDateInput,
  instantToTimeInput,
} from '@/lib/utils/session-time';
import { Currency, CURRENCIES } from '@darnozom/shared-types';

import { getErrorMessage } from '@/lib/schema/utils/gerErrorMessage';
import { toast } from 'react-toastify';

const DURATIONS = [15, 30, 45, 60, 90, 120];

/** Curated IANA timezones plus the viewer's own, deduped. */
const TIMEZONE_OPTIONS = [
  ...new Set([
    getBrowserTimeZone(),
    'Africa/Cairo',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Europe/London',
    'America/New_York',
    'UTC',
  ]),
];

interface PrivateSessionFormProps {
  session?: IPrivateSession;
}

export function PrivateSessionForm({ session }: PrivateSessionFormProps) {
  const t = useTranslations('PrivateSessions');
  const tVal = useTranslations('PrivateSessions.validation');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const isEditing = !!session;

  const privateSessionSchema = useMemo(() => buildPrivateSessionSchema(tVal), [tVal]);

  const formTimezone = session?.availableSlots?.[0]?.timezone ?? getBrowserTimeZone();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PrivateSessionFormValues>({
    resolver: yupResolver(privateSessionSchema) as Resolver<PrivateSessionFormValues>,
    defaultValues: {
      title: session?.title ?? '',
      description: session?.description ?? '',
      duration: session?.duration ?? 60,
      pricing: {
        price: session?.pricing?.price ?? 0,
        currency: session?.pricing?.currency ?? 'USD',
      },
      sessionType: session?.sessionType ?? SessionType.ONLINE,
      location: session?.location ?? '',
      isActive: session?.isActive ?? true,
      timezone: formTimezone,
      availableSlots:
        session?.availableSlots?.map((s) => ({
          date: s.startsAt ? instantToDateInput(s.startsAt, s.timezone) : '',
          startTime: s.startsAt ? instantToTimeInput(s.startsAt, s.timezone) : '',
          endTime: s.endsAt ? instantToTimeInput(s.endsAt, s.timezone) : '',
          provider: s.provider ?? 'EXTERNAL_URL',
          meetingUrl: s.meetingUrl ?? '',
          maxBookings: s.maxBookings ?? 1,
        })) ?? [],
    },
  });

  const slots = watch('availableSlots') ?? [];
  const timezone = watch('timezone');
  const isActive = watch('isActive');
  const duration = watch('duration');

  const addSlot = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setValue('availableSlots', [
      ...slots,
      {
        date: tomorrow.toISOString().slice(0, 10),
        startTime: '10:00',
        endTime: '11:00',
        meetingUrl: '',
        maxBookings: 1,
      },
    ]);
  };

  const removeSlot = (index: number) => {
    setValue(
      'availableSlots',
      slots.filter((_, i) => i !== index)
    );
  };

  const onSubmit = async (values: PrivateSessionFormValues) => {
    const payload: Record<string, unknown> = {
      ...values,
      ...(values.availableSlots?.length
        ? {
            availableSlots: values.availableSlots.map((s) => ({
              ...s,
              startTime: formatSlotTimeForApi(s.startTime),
              endTime: formatSlotTimeForApi(s.endTime),
              // Server converts date + time + this zone into UTC instants.
              timezone: values.timezone,
            })),
          }
        : {}),
    };

    const result = isEditing
      ? await updatePrivateSession(session._id, payload)
      : await createPrivateSession(payload as Parameters<typeof createPrivateSession>[0]);

    if (result && isNatsErrResult(result)) {
      toast.error(result.err.message);
      return;
    }

    router.push(ROUTE_ORG_PRIVATE_SESSIONS);
  };

  const onError = (errors: FieldErrors<PrivateSessionFormValues>) => {
    const { messages } = getErrorMessage(errors);
    for (const message of messages) {
      toast.error(message);
    }
    if (messages.length === 0) {
      toast.error(tCommon('errors.somethingWentWrong'));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit, onError)(e);
      }}
      className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t('editSession') : t('createSession')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title">{t('form.title')}</Label>
            <Input id="title" {...register('title')} />
            {errors.title ? (
              <p className="text-destructive text-sm">{errors.title.message}</p>
            ) : null}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description">{t('form.description')}</Label>
            <Textarea id="description" {...register('description')} rows={3} />
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <Label htmlFor="duration">{t('form.duration')}</Label>
            <Select
              value={String(duration ?? 60)}
              onValueChange={(v) => setValue('duration', Number.parseInt(v, 10))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {t('durationMinutes', { count: d })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="price">{t('form.price')}</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                {...register('pricing.price', { valueAsNumber: true })}
              />
              {errors.pricing?.price ? (
                <p className="text-destructive text-sm">{errors.pricing.price.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>{t('form.currency')}</Label>
              <Select
                defaultValue={Currency.DEFAULT}
                onValueChange={(v) => setValue('pricing.currency', v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-1">
            <Label>{t('form.sessionType')}</Label>
            <Select
              defaultValue={session?.sessionType ?? SessionType.ONLINE}
              onValueChange={(v) => setValue('sessionType', v as SessionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SessionType.ONLINE}>{t('form.online')}</SelectItem>
                <SelectItem value={SessionType.OFFLINE}>{t('form.offline')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label htmlFor="location">{t('form.location')}</Label>
            <Input id="location" {...register('location')} />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={isActive ?? true}
              onCheckedChange={(v) => setValue('isActive', v)}
            />
            <Label htmlFor="isActive">{t('form.active')}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Available Slots */}
      <Card>
        <CardHeader>
          <CardTitle>{t('form.availableSlots')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timezone — the zone slot times are authored in; server stores UTC instants */}
          <div className="max-w-xs space-y-1">
            <Label>{t('form.timezone')}</Label>
            <Select value={timezone} onValueChange={(v) => setValue('timezone', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.timezone ? (
              <p className="text-destructive text-sm">{errors.timezone.message}</p>
            ) : null}
          </div>

          {slots.map((_, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="grid grid-cols-4 items-end gap-2">
                <div className="space-y-1">
                  <Label>{t('form.date')}</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={slots[index]?.date ?? ''}
                    onChange={(e) => {
                      const updated = [...slots];
                      updated[index] = { ...updated[index], date: e.target.value };
                      setValue('availableSlots', updated, { shouldValidate: true });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t('form.startTime')}</Label>
                  <Input
                    type="time"
                    value={slots[index]?.startTime ?? ''}
                    onChange={(e) => {
                      const updated = [...slots];
                      updated[index] = { ...updated[index], startTime: e.target.value };
                      setValue('availableSlots', updated, { shouldValidate: true });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t('form.endTime')}</Label>
                  <Input
                    type="time"
                    value={slots[index]?.endTime ?? ''}
                    onChange={(e) => {
                      const updated = [...slots];
                      updated[index] = { ...updated[index], endTime: e.target.value };
                      setValue('availableSlots', updated, { shouldValidate: true });
                    }}
                  />
                  {errors.availableSlots?.[index]?.endTime ? (
                    <p className="text-destructive text-sm">
                      {errors.availableSlots?.[index]?.endTime?.message}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeSlot(index)}>
                  {t('removeSlot')}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  {/* Provider selector per slot */}
                  <Label>{t('form.provider')}</Label>
                  <Select
                    value={slots[index]?.provider ?? 'EXTERNAL_URL'}
                    onValueChange={(v) => {
                      const updated = [...slots];
                      updated[index] = {
                        ...updated[index],
                        provider: v as 'EXTERNAL_URL' | 'AGORA',
                      };
                      setValue('availableSlots', updated, { shouldValidate: true });
                    }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXTERNAL_URL">{t('form.providerExternalUrl')}</SelectItem>
                      <SelectItem value="AGORA">{t('form.providerAgora')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Meeting URL — only for EXTERNAL_URL */}
                  {(slots[index]?.provider ?? 'EXTERNAL_URL') === 'EXTERNAL_URL' && (
                    <>
                      <Label className="mt-2 block">{t('form.meetingUrl')}</Label>
                      <Input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={slots[index]?.meetingUrl ?? ''}
                        onChange={(e) => {
                          const updated = [...slots];
                          updated[index] = { ...updated[index], meetingUrl: e.target.value };
                          setValue('availableSlots', updated, { shouldValidate: true });
                        }}
                      />
                      {(errors.availableSlots?.[index] as { meetingUrl?: { message?: string } })
                        ?.meetingUrl ? (
                        <p className="text-destructive text-sm">
                          {
                            (
                              errors.availableSlots?.[index] as {
                                meetingUrl?: { message?: string };
                              }
                            )?.meetingUrl?.message
                          }
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>{t('form.maxBookings')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={slots[index]?.maxBookings ?? 1}
                    onChange={(e) => {
                      const updated = [...slots];
                      updated[index] = {
                        ...updated[index],
                        maxBookings: Number.parseInt(e.target.value, 10) || 1,
                      };
                      setValue('availableSlots', updated, { shouldValidate: true });
                    }}
                  />
                  {(errors.availableSlots?.[index] as { maxBookings?: { message?: string } })
                    ?.maxBookings ? (
                    <p className="text-destructive text-sm">
                      {
                        (errors.availableSlots?.[index] as { maxBookings?: { message?: string } })
                          ?.maxBookings?.message
                      }
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addSlot}>
            {t('form.addSlot')}
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? t('editSession') : t('createSession')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(ROUTE_ORG_PRIVATE_SESSIONS)}>
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
}
