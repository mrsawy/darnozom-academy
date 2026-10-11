import * as yup from 'yup';

import { UserStatus, Country, Currency } from '@darnozom/shared-types';

type TVal = (key: string) => string;

const optionalSocialUrl = (invalidMessage: string) =>
  yup
    .string()
    .transform((v: string) => (v == null || v === '' ? undefined : v))
    .optional()
    .url(invalidMessage);

function buildAddressSchema() {
  return yup.object({
    street: yup.string().optional(),
    city: yup.string().optional(),
    state: yup.string().optional(),
    zipCode: yup.string().optional(),
    country: yup.string().optional(),
  });
}

export function buildSocialLinksSchema(tVal: TVal) {
  return yup.object({
    linkedin: optionalSocialUrl(tVal('linkedinUrlInvalid')),
    twitter: optionalSocialUrl(tVal('twitterUrlInvalid')),
    instagram: optionalSocialUrl(tVal('instagramUrlInvalid')),
    facebook: optionalSocialUrl(tVal('facebookUrlInvalid')),
    youtube: optionalSocialUrl(tVal('youtubeUrlInvalid')),
    tiktok: optionalSocialUrl(tVal('tiktokUrlInvalid')),
    website: optionalSocialUrl(tVal('websiteUrlInvalid')),
    other: optionalSocialUrl(tVal('urlInvalid')),
  });
}

function buildProfileSchema(tVal: TVal) {
  return yup.object({
    bio: yup.string().max(1000, tVal('bioMax')).optional(),
    shortBio: yup.string().max(200, tVal('shortBioMax')).optional(),
    avatarFile: yup
      .mixed<File>()
      .test('fileType', tVal('avatarFileType'), (value) => {
        if (!value) return true;
        return ['image/jpeg', 'image/png', 'image/webp'].includes(value.type);
      })
      .nullable()
      .optional(),
    avatar: yup.string().optional(),
    dateOfBirth: yup.date().max(new Date(), tVal('dateOfBirthFuture')).optional(),
    address: buildAddressSchema().optional(),
    socialLinks: buildSocialLinksSchema(tVal).optional(),
  });
}

function buildPreferencesSchema() {
  return yup.object({
    language: yup.string().default('en'),
    emailNotifications: yup.boolean().default(true),
    darkMode: yup.boolean().default(false),
  });
}

function buildBaseUserSchema(tVal: TVal) {
  return yup.object({
    username: yup
      .string()
      .required(tVal('usernameRequired'))
      .min(3, tVal('usernameMin'))
      .max(30, tVal('usernameMax'))
      .matches(/^[a-zA-Z0-9_]+$/, tVal('usernamePattern')),
    email: yup.string().required(tVal('emailRequired')).email(tVal('emailInvalid')),
    phone: yup
      .string()
      .required(tVal('phoneRequired'))
      .matches(/^[+]?[0-9]\d{8,14}$/, tVal('phoneInvalid'))
      .min(9, tVal('phoneInvalid')),
    firstName: yup.string().required(tVal('firstNameRequired')).min(2, tVal('firstNameMin')),
    lastName: yup.string().required(tVal('lastNameRequired')).min(2, tVal('lastNameMin')),
    roleName: yup.string().required(tVal('roleRequired')),
    organizationId: yup.string().optional(),
    profile: buildProfileSchema(tVal).optional(),
    preferences: buildPreferencesSchema().optional(),
    status: yup.string().oneOf(Object.values(UserStatus)).default(UserStatus.ACTIVE),
    preferredCurrency: yup.string().oneOf(Object.values(Currency)).optional(),
    studentIdentifier: yup.string().optional(),
    country: yup
      .string()
      .oneOf(Object.values(Country), tVal('countryInvalid'))
      .required(tVal('countryRequired')),
    categoriesIds: yup.array().of(yup.string()).optional(),
    gradesIds: yup.array().of(yup.string()).optional(),
    schoolTypesIds: yup.array().of(yup.string()).optional(),
    parentUserId: yup.string().optional().nullable(),
    childUsersIds: yup.array().of(yup.string()).optional(),
    childUsers: yup
      .array()
      .of(
        yup.object({
          _id: yup.string().required(),
          firstName: yup.string().optional(),
          lastName: yup.string().optional(),
        })
      )
      .optional(),
    categories: yup
      .array()
      .of(
        yup.object({
          _id: yup.string().required(),
          name: yup.string().required(),
        })
      )
      .optional(),
    grades: yup
      .array()
      .of(
        yup.object({
          _id: yup.string().required(),
          nameEn: yup.string().required(),
          nameAr: yup.string().required(),
        })
      )
      .optional(),
    schoolTypes: yup
      .array()
      .of(
        yup.object({
          _id: yup.string().required(),
          nameEn: yup.string().required(),
          nameAr: yup.string().required(),
        })
      )
      .optional(),
  });
}

export function buildCreateUserSchema(tVal: TVal) {
  return buildBaseUserSchema(tVal).shape({
    _id: yup.string().optional(),
    password: yup
      .string()
      .required(tVal('passwordRequired'))
      .min(8, tVal('passwordMin'))
      .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, tVal('passwordPattern')),
    confirmPassword: yup
      .string()
      .required(tVal('confirmPasswordRequired'))
      .oneOf([yup.ref('password')], tVal('confirmPasswordMatch')),
  });
}

export function buildEditUserSchema(tVal: TVal) {
  return buildBaseUserSchema(tVal).shape({
    _id: yup.string().required(tVal('userIdRequired')),
    password: yup
      .string()
      .nullable()
      .notRequired()
      .test('password-min', tVal('passwordMin'), (value) => {
        if (!value || value.length === 0) return true;
        return value.length >= 8;
      })
      .test('password-pattern', tVal('passwordPattern'), (value) => {
        if (!value || value.length === 0) return true;
        return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value);
      }),
    confirmPassword: yup
      .string()
      .nullable()
      .notRequired()
      .test('confirm-password', tVal('confirmPasswordRequired'), function (value) {
        const parent = this.parent as { password?: string | null };
        const { password } = parent;
        if (password != null && password.length > 0) {
          if (!value) return false;
          return value === password;
        }
        return true;
      }),
  });
}

/** @deprecated Prefer buildCreateUserSchema with next-intl. Kept for type inference fallbacks. */
export const createUserSchema = buildCreateUserSchema((k) => k);
/** @deprecated Prefer buildEditUserSchema with next-intl. Kept for type inference fallbacks. */
export const editUserSchema = buildEditUserSchema((k) => k);

export type CreateUserFormData = yup.InferType<ReturnType<typeof buildCreateUserSchema>>;
export type EditUserFormData = yup.InferType<ReturnType<typeof buildEditUserSchema>>;

/** English-key identity translator for InferType / tests when no locale is bound. */
export const socialLinksSchema = buildSocialLinksSchema((k) => k);

export { UserStatus } from '@darnozom/shared-types';

export enum UserCurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}
