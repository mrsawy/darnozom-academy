import * as Yup from 'yup';
import { Country } from '@lms-organization/shared-types';

const PASSWORD_MIN_LENGTH = 8;

export type CreateParentFormSchemaTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string;

export function buildCreateParentSchema(t: CreateParentFormSchemaTranslate) {
  return Yup.object({
    firstName: Yup.string().required(t('schema.firstNameRequired')),
    lastName: Yup.string().required(t('schema.lastNameRequired')),
    username: Yup.string().required(t('schema.usernameRequired')),
    email: Yup.string().email(t('schema.emailInvalid')).required(t('schema.emailRequired')),
    phone: Yup.string()
      .matches(/^\+?\d+$/, t('schema.phoneInvalid'))
      .required(t('schema.phoneRequired')),
    password: Yup.string()
      .min(PASSWORD_MIN_LENGTH, t('schema.passwordMin', { min: PASSWORD_MIN_LENGTH }))
      .required(t('schema.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], t('schema.confirmPasswordMatch'))
      .required(t('schema.confirmPasswordRequired')),
    country: Yup.string()
      .oneOf(Object.values(Country), t('schema.countryInvalid'))
      .required(t('schema.countryRequired')),
  });
}

export type CreateParentFormValues = Yup.InferType<ReturnType<typeof buildCreateParentSchema>>;
