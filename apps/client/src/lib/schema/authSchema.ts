import * as Yup from 'yup';
import { InferType } from 'yup';
import { UserMainRoles } from '../data/userRole.enum';
import {
  Country,
  IDENTIFIER_CHARS_PATTERN,
  IDENTIFIER_PATTERN,
  IDENTIFIER_STARTS_WITH_LETTER,
} from '@darnozom/shared-types';

export const signupSchema = Yup.object().shape({
  firstName: Yup.string()
    .required('First name is required')
    .min(3, 'First name must be at least 3 characters'),
  lastName: Yup.string()
    .required('Last name is required')
    .min(3, 'Last name must be at least 3 characters'),

  email: Yup.string().email('Invalid email format').required('Email is required'),

  username: Yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .matches(
      IDENTIFIER_CHARS_PATTERN,
      'Username can only contain letters, numbers, and underscores'
    )
    .test('no-spaces', 'Username cannot contain spaces', (value) => !value?.includes(' '))
    .test('starts-with-letter', 'Username must start with a letter', (value) =>
      IDENTIFIER_STARTS_WITH_LETTER.test(value || '')
    ),

  phoneNumber: Yup.string()
    .required('Phone number is required')
    .matches(/^\+?[0-9]\d{1,14}$/, 'Please enter a valid phone number'),

  country: Yup.string()
    .oneOf(Object.values(Country), 'Please select a valid country')
    .required('Country is required'),

  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),

  // confirmPassword: Yup.string()
  //     .oneOf([Yup.ref('password')], 'Passwords must match')
  //     .required('Please confirm your password'),

  roleName: Yup.string()
    .oneOf(Object.values(UserMainRoles), 'Invalid role')
    .required('Role is required'),

  acceptedTerms: Yup.boolean()
    .oneOf([true], 'You must accept the Rules & Privacy Policy')
    .required('You must accept the Rules & Privacy Policy'),

  organizationName: Yup.string()
    .optional()
    .test('organization-name-required', 'Organization name is required', function (value) {
      const parent = this.parent as { role?: string };
      const { role } = parent;
      if (role === UserMainRoles.ORGANIZATION) {
        return value != null && value.trim() !== '';
      }
      return true;
    }),
  organizationSlug: Yup.string()
    .optional()
    .test('organization-slug-required', 'Organization slug is required', function (value) {
      const parent = this.parent as { role?: string };
      const { role } = parent;
      if (role === UserMainRoles.ORGANIZATION) {
        if (!value || value.trim() === '') return false;
        if (value.length < 3 || value.length > 20) return false;
        if (!IDENTIFIER_PATTERN.test(value)) return false;
        if (value.includes(' ')) return false;
      }
      return true;
    })
    .test(
      'organization-slug-min',
      'Organization Slug must be at least 3 characters',
      function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return value.length >= 3;
        }
        return true;
      }
    )
    .test(
      'organization-slug-max',
      'Organization Slug must be less than 20 characters',
      function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return value.length <= 20;
        }
        return true;
      }
    )
    .test(
      'organization-slug-format',
      'Organization Slug can only contain letters, numbers, and underscores',
      function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return IDENTIFIER_CHARS_PATTERN.test(value);
        }
        return true;
      }
    )
    .test(
      'organization-slug-no-spaces',
      'Organization Slug cannot contain spaces',
      function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return !value.includes(' ');
        }
        return true;
      }
    )
    .test(
      'organization-slug-starts-with-letter',
      'Organization Slug must start with a letter',
      function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return IDENTIFIER_STARTS_WITH_LETTER.test(value);
        }
        return true;
      }
    ),
});

export const loginSchema = Yup.object().shape({
  identifier: Yup.string().required('username , phone or email are required'),
  password: Yup.string().required('Password is required'),
});

export const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email format').required('Email is required'),
});

export const resetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords do not match')
    .required('Please confirm your password'),
});

export type LoginSchema = InferType<typeof loginSchema>;
export type SignupSchema = InferType<typeof signupSchema>;
export type ForgotPasswordSchema = InferType<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = InferType<typeof resetPasswordSchema>;
