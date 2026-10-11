import * as Yup from 'yup';
import { CURRENCIES, IDENTIFIER_PATTERN, Roles } from '@darnozom/shared-types';

/** Public OAuth onboarding choices: Student, Parent, or org admin (teacher) role. */
export const ONBOARDING_ROLES = [Roles.STUDENT, Roles.PARENT, Roles.SUPER_ADMIN] as const;

export function buildOnboardingSchema(tVal: (key: string) => string) {
  return Yup.object({
    roleName: Yup.string()
      .oneOf(ONBOARDING_ROLES as unknown as string[], tVal('roleInvalid'))
      .required(tVal('roleRequired')),
    phone: Yup.string()
      .matches(/^\+?\d{7,15}$/, tVal('phoneInvalid'))
      .required(tVal('phoneRequired')),
    preferredCurrency: Yup.string()
      .oneOf(CURRENCIES as string[], tVal('currencyInvalid'))
      .required(tVal('currencyInvalid')),
    organizationName: Yup.string().when('roleName', ([roleName], schema) =>
      roleName === Roles.SUPER_ADMIN
        ? schema.required(tVal('orgNameRequired')).min(2)
        : schema.optional()
    ),
    organizationSlug: Yup.string().when('roleName', ([roleName], schema) =>
      roleName === Roles.SUPER_ADMIN
        ? schema
            .required(tVal('orgSlugRequired'))
            .min(3)
            .max(20)
            .matches(IDENTIFIER_PATTERN, tVal('orgSlugInvalid'))
        : schema.optional()
    ),
    acceptedTerms: Yup.boolean().when('roleName', ([roleName], schema) =>
      roleName === Roles.SUPER_ADMIN
        ? schema.oneOf([true], tVal('termsRequired')).required(tVal('termsRequired'))
        : schema.optional()
    ),
  });
}

export type OnboardingSchema = Yup.InferType<ReturnType<typeof buildOnboardingSchema>>;
