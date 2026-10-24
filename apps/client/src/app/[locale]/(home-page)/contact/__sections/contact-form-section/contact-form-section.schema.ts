import * as yup from 'yup';

type Translate = (key: string) => string;

/**
 * Built per render so validation messages follow the active locale.
 * Keep this file free of JSX — schemas and types only.
 */
export function createContactFormSchema(t: Translate) {
  return yup.object({
    firstName: yup
      .string()
      .required(t('validation.firstName.required'))
      .min(2, t('validation.firstName.min')),
    lastName: yup
      .string()
      .required(t('validation.lastName.required'))
      .min(2, t('validation.lastName.min')),
    email: yup
      .string()
      .required(t('validation.email.required'))
      .email(t('validation.email.invalid')),
    subject: yup
      .string()
      .required(t('validation.subject.required'))
      .min(3, t('validation.subject.min')),
    message: yup
      .string()
      .required(t('validation.message.required'))
      .min(10, t('validation.message.min')),
  });
}

export type ContactFormSchema = ReturnType<typeof createContactFormSchema>;

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

export const CONTACT_FORM_DEFAULTS: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  subject: '',
  message: '',
};
