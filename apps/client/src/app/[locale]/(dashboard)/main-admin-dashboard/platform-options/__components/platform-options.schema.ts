import * as yup from 'yup';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const optionalEmail = () =>
  yup.string().transform(emptyToUndefined).optional().email('Must be a valid email');

const optionalUrl = () =>
  yup.string().transform(emptyToUndefined).optional().url('Must be a valid URL');

export const platformOptionsSchema = yup.object({
  PLATFORM_NAME: yup.string().optional(),
  PLATFORM_EMAIL: optionalEmail(),
  PLATFORM_SUPPORT_EMAIL: optionalEmail(),
  PLATFORM_LOGO_URL: optionalUrl(),
  PLATFORM_WEBSITE_URL: optionalUrl(),
  PLATFORM_PHONE: yup.string().optional(),
  PLATFORM_TERMS_URL: optionalUrl(),
  PLATFORM_PRIVACY_URL: optionalUrl(),
});

export type PlatformOptionsFormValues = yup.InferType<typeof platformOptionsSchema>;

export const defaultPlatformOptionsValues: PlatformOptionsFormValues = {
  PLATFORM_NAME: '',
  PLATFORM_EMAIL: '',
  PLATFORM_SUPPORT_EMAIL: '',
  PLATFORM_LOGO_URL: '',
  PLATFORM_WEBSITE_URL: '',
  PLATFORM_PHONE: '',
  PLATFORM_TERMS_URL: '',
  PLATFORM_PRIVACY_URL: '',
};
