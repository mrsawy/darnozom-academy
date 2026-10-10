import * as yup from 'yup';
import { Currency } from '@lms-organization/shared-types';

import { buildSocialLinksSchema } from '@/lib/schema/user.schema';

export {
  buildCreateUserSchema,
  buildEditUserSchema,
  type CreateUserFormData,
  type EditUserFormData,
} from '@/lib/schema/user.schema';

type TVal = (key: string) => string;

function buildSelfProfileSchema(tVal: TVal) {
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
    dateOfBirth: yup.date().max(new Date(), tVal('dateOfBirthFuture')).nullable().optional(),
    address: yup
      .object({
        street: yup.string().optional(),
        city: yup.string().optional(),
        state: yup.string().optional(),
        zipCode: yup.string().optional(),
        country: yup.string().optional(),
      })
      .optional(),
    socialLinks: buildSocialLinksSchema(tVal).optional(),
  });
}

function buildSelfPreferencesSchema() {
  return yup.object({
    language: yup.string().default('en'),
    emailNotifications: yup.boolean().default(true),
    darkMode: yup.boolean().default(false),
  });
}

/** Schema used when the logged-in user edits their own account (no email/role/country required). */
export function buildSelfUserSchema(tVal: TVal) {
  return yup.object({
    firstName: yup.string().required(tVal('firstNameRequired')).min(2, tVal('firstNameMin')),
    lastName: yup.string().required(tVal('lastNameRequired')).min(2, tVal('lastNameMin')),
    username: yup
      .string()
      .required(tVal('usernameRequired'))
      .min(3, tVal('usernameMin'))
      .max(30, tVal('usernameMax'))
      .matches(/^[a-zA-Z0-9_]+$/, tVal('usernamePattern')),
    phone: yup
      .string()
      .required(tVal('phoneRequired'))
      .matches(/^[+]?[0-9]\d{8,14}$/, tVal('phoneInvalid')),
    preferredCurrency: yup
      .string()
      .oneOf(Object.values(Currency) as [Currency, ...Currency[]])
      .optional(),
    /** Read-only here, but kept so the form can tell whether to show instructor fields. */
    roleName: yup.string().optional(),
    /** Instructor subjects (categories), grades, and school types — self-editable. */
    categoriesIds: yup.array().of(yup.string()).optional(),
    gradesIds: yup.array().of(yup.string()).optional(),
    schoolTypesIds: yup.array().of(yup.string()).optional(),
    categories: yup
      .array()
      .of(yup.object({ _id: yup.string().required(), name: yup.string().required() }))
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
    profile: buildSelfProfileSchema(tVal).optional(),
    preferences: buildSelfPreferencesSchema().optional(),
    password: yup
      .string()
      .nullable()
      .optional()
      .test('password-min', tVal('passwordMin'), (v) => !v || v.length === 0 || v.length >= 8)
      .test('password-pattern', tVal('passwordPattern'), (v) =>
        !v || v.length === 0 ? true : /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v)
      ),
    confirmPassword: yup
      .string()
      .nullable()
      .optional()
      .test('confirm-match', tVal('confirmPasswordMatch'), function (value) {
        const pwd = (this.parent as { password?: string }).password;
        if (pwd && pwd.length > 0) return value === pwd;
        return true;
      }),
  });
}

/** @deprecated Prefer buildSelfUserSchema with next-intl. */
export const selfUserSchema = buildSelfUserSchema((k) => k);

export type SelfUserFormData = yup.InferType<ReturnType<typeof buildSelfUserSchema>>;
