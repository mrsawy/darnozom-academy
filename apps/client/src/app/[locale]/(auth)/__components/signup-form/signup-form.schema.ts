import * as Yup from 'yup';
import { InferType } from 'yup';
import { UserMainRoles } from '@/lib/data/userRole.enum';
import {
  Country,
  IDENTIFIER_CHARS_PATTERN,
  IDENTIFIER_PATTERN,
  IDENTIFIER_STARTS_WITH_LETTER,
} from '@darnozom/shared-types';

export function buildSignupSchema(tVal: (key: string) => string) {
  return Yup.object().shape({
    firstName: Yup.string().required(tVal('firstNameRequired')).min(3, tVal('firstNameMin')),
    lastName: Yup.string().required(tVal('lastNameRequired')).min(3, tVal('lastNameMin')),

    email: Yup.string().email(tVal('emailInvalid')).required(tVal('emailRequired')),

    username: Yup.string()
      .required(tVal('usernameRequired'))
      .min(3, tVal('usernameMin'))
      .max(20, tVal('usernameMax'))
      .matches(IDENTIFIER_CHARS_PATTERN, tVal('usernameInvalid'))
      .test('no-spaces', tVal('usernameNoSpaces'), (value) => !value?.includes(' '))
      .test('starts-with-letter', tVal('usernameStartsWithLetter'), (value) =>
        IDENTIFIER_STARTS_WITH_LETTER.test(value || '')
      ),

    phoneNumber: Yup.string()
      .required(tVal('phoneRequired'))
      .matches(/^\+?[0-9]\d{1,14}$/, tVal('phoneInvalid')),

    country: Yup.string()
      .oneOf(Object.values(Country), tVal('countryInvalid'))
      .required(tVal('countryRequired')),

    password: Yup.string().min(6, tVal('passwordMin')).required(tVal('passwordRequired')),

    roleName: Yup.string()
      .oneOf(Object.values(UserMainRoles), tVal('roleInvalid'))
      .required(tVal('roleRequired')),

    acceptedTerms: Yup.boolean()
      .oneOf([true], tVal('termsRequired'))
      .required(tVal('termsRequired')),

    organizationName: Yup.string()
      .optional()
      .test('organization-name-required', tVal('orgNameRequired'), function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION) {
          return value != null && value.trim() !== '';
        }
        return true;
      }),
    organizationSlug: Yup.string()
      .optional()
      .test('organization-slug-required', tVal('orgSlugRequired'), function (value) {
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
      .test('organization-slug-min', tVal('orgSlugMin'), function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return value.length >= 3;
        }
        return true;
      })
      .test('organization-slug-max', tVal('orgSlugMax'), function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return value.length <= 20;
        }
        return true;
      })
      .test('organization-slug-format', tVal('orgSlugInvalid'), function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return IDENTIFIER_CHARS_PATTERN.test(value);
        }
        return true;
      })
      .test('organization-slug-no-spaces', tVal('orgSlugNoSpaces'), function (value) {
        const parent = this.parent as { role?: string };
        const { role } = parent;
        if (role === UserMainRoles.ORGANIZATION && value) {
          return !value.includes(' ');
        }
        return true;
      })
      .test(
        'organization-slug-starts-with-letter',
        tVal('orgSlugStartsWithLetter'),
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
}

export type SignupSchema = InferType<ReturnType<typeof buildSignupSchema>>;
