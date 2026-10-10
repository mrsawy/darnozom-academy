import * as Yup from 'yup';
import { SessionType } from '@/lib/types/private-session/private-session.interface';

/** Matches `<input type="time">` values: 24-hour `HH:MM` (optional `:ss` from some browsers). */
export const HTML_TIME_INPUT_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Converts legacy 12-hour strings (e.g. `10:00 am`) to `HH:MM` for the native time input.
 * Pass-through if already valid 24-hour form.
 */
export function normalizeSlotTimeForInput(value: string | undefined): string {
  if (!value?.trim()) return '';
  const v = value.trim();
  if (HTML_TIME_INPUT_REGEX.test(v)) return v.slice(0, 5);
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(v);
  if (!m) return '';
  let h = Number.parseInt(m[1], 10);
  const min = m[2];
  const isPm = m[3].toLowerCase() === 'pm';
  if (h === 12) {
    h = isPm ? 12 : 0;
  } else if (isPm) {
    h += 12;
  }
  return `${String(h).padStart(2, '0')}:${min}`;
}

/** Minutes since midnight for a 24-hour `HH:MM` (or `HH:MM:SS`) prefix; invalid → `null`. */
export function slotTimeToMinutes(time: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)/.exec(time.trim());
  if (!m) return null;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

/** API / DB store times as 12-hour `H:MM am|pm` (see server `AvailableSlotDto`). */
export function formatSlotTimeForApi(time24: string): string {
  const m = /^([01]\d|2[0-3]):([0-5]\d)/.exec(time24.trim());
  if (!m) return time24;
  const h = Number.parseInt(m[1], 10);
  const min = m[2];
  const isPm = h >= 12;
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${min} ${isPm ? 'pm' : 'am'}`;
}

function buildAvailableSlotSchema(tVal: (key: string) => string) {
  return Yup.object({
    date: Yup.string().required(tVal('dateRequired')),
    startTime: Yup.string()
      .matches(HTML_TIME_INPUT_REGEX, tVal('timeFormat'))
      .required(tVal('startTimeRequired')),
    endTime: Yup.string()
      .matches(HTML_TIME_INPUT_REGEX, tVal('timeFormat'))
      .required(tVal('endTimeRequired')),
    provider: Yup.string().oneOf(['EXTERNAL_URL', 'AGORA']).optional().default('EXTERNAL_URL'),
    meetingUrl: Yup.string().when('provider', {
      is: (v: string | undefined) => !v || v === 'EXTERNAL_URL',
      // eslint-disable-next-line unicorn/no-thenable -- Yup conditional schema API
      then: (s) => s.url(tVal('meetingUrlInvalid')).optional(),
      otherwise: (s) => s.optional(),
    }),
    maxBookings: Yup.number()
      .min(1, tVal('maxBookingsMin'))
      .max(50, tVal('maxBookingsMax'))
      .required(tVal('maxBookingsRequired')),
  }).test('end-after-start', tVal('endTimeAfterStart'), function endAfterStart(slot) {
    const { startTime, endTime } = slot as { startTime?: string; endTime?: string };
    const start = startTime ? slotTimeToMinutes(startTime) : null;
    const end = endTime ? slotTimeToMinutes(endTime) : null;
    if (start === null || end === null) return true;
    if (end > start) return true;
    return this.createError({ path: 'endTime', message: tVal('endTimeAfterStart') });
  });
}

export function buildPrivateSessionSchema(tVal: (key: string) => string) {
  const availableSlotSchema = buildAvailableSlotSchema(tVal);
  return Yup.object({
    title: Yup.string().required(tVal('titleRequired')),
    description: Yup.string().optional(),
    duration: Yup.number().min(15, tVal('durationMin')).required(tVal('durationRequired')),
    pricing: Yup.object({
      price: Yup.number().min(0, tVal('priceMin')).required(tVal('priceRequired')),
      currency: Yup.string().required(tVal('currencyRequired')),
    }).required(tVal('pricingRequired')),
    sessionType: Yup.mixed<SessionType>()
      .oneOf(Object.values(SessionType) as SessionType[], tVal('sessionTypeInvalid'))
      .required(tVal('sessionTypeRequired')),
    location: Yup.string().optional(),
    isActive: Yup.boolean().optional(),
    /** IANA timezone the slot times are authored in; the server converts to UTC instants. */
    timezone: Yup.string().required(tVal('timezoneRequired')),
    availableSlots: Yup.array(availableSlotSchema).optional(),
    thumbnailKey: Yup.string().optional(),
  });
}

/**
 * Explicit form values type (not Yup.InferType) so react-hook-form + yupResolver agree on
 * optional keys — InferType and the resolver’s output type diverge for `.optional()` fields.
 */
export interface PrivateSessionFormValues {
  title: string;
  description?: string;
  duration: number;
  pricing: { price: number; currency: string };
  sessionType: SessionType;
  location?: string;
  isActive?: boolean;
  timezone: string;
  availableSlots?: {
    date: string;
    startTime: string;
    endTime: string;
    provider?: 'EXTERNAL_URL' | 'AGORA';
    meetingUrl?: string;
    maxBookings: number;
  }[];
  thumbnailKey?: string;
}
