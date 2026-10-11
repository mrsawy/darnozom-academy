import * as yup from 'yup';
import { Currency } from '@darnozom/shared-types';

export const basicSchema = yup.object({
  firstName: yup.string().required().min(2),
  lastName: yup.string().required().min(2),
  username: yup
    .string()
    .required()
    .min(3)
    .max(30)
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  phone: yup
    .string()
    .required()
    .matches(/^[+]?[0-9]\d{8,14}$/, 'Invalid phone number format'),
  preferredCurrency: yup
    .string()
    .oneOf(Object.values(Currency) as [Currency, ...Currency[]])
    .required(),
});

export const profileSchema = yup.object({
  bio: yup.string().max(1000).optional(),
  shortBio: yup.string().max(200).optional(),
  avatarFile: yup
    .mixed<File>()
    .test('fileType', 'Only image files are allowed', (value) => {
      if (!value) return true;
      return ['image/jpeg', 'image/png', 'image/webp'].includes(value.type);
    })
    .nullable()
    .optional(),
  avatar: yup.string().optional(),
  dateOfBirth: yup
    .date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .nullable()
    .optional(),
  street: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  zipCode: yup.string().optional(),
  linkedin: yup
    .string()
    .transform((v: string) => (v == null || v === '' ? undefined : v))
    .optional()
    .url('Invalid LinkedIn URL'),
  twitter: yup
    .string()
    .transform((v: string) => (v == null || v === '' ? undefined : v))
    .optional()
    .url('Invalid Twitter / X URL'),
});

export const securitySchema = yup.object({
  password: yup
    .string()
    .nullable()
    .optional()
    .test(
      'password-min',
      'Password must be at least 8 characters',
      (v) => !v || v.length === 0 || v.length >= 8
    )
    .test('password-pattern', 'Must contain uppercase, lowercase, and a number', (v) =>
      !v || v.length === 0 ? true : /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v)
    ),
  confirmPassword: yup
    .string()
    .nullable()
    .optional()
    .test('confirm-match', 'Passwords must match', function (value) {
      const pwd = (this.parent as { password?: string }).password;
      if (pwd && pwd.length > 0) return value === pwd;
      return true;
    }),
});

export const preferencesSchema = yup.object({
  language: yup.string().default('en'),
  emailNotifications: yup.boolean().default(true),
  darkMode: yup.boolean().default(false),
});

export type BasicForm = yup.InferType<typeof basicSchema>;
export type ProfileForm = yup.InferType<typeof profileSchema>;
export type SecurityForm = yup.InferType<typeof securitySchema>;
export type PreferencesForm = yup.InferType<typeof preferencesSchema>;
