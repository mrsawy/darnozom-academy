import * as Yup from 'yup';
import { InferType } from 'yup';

export function buildResetPasswordSchema(tVal: (key: string) => string) {
  return Yup.object().shape({
    newPassword: Yup.string().min(8, tVal('passwordMin')).required(tVal('passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword')], tVal('passwordsMismatch'))
      .required(tVal('confirmPasswordRequired')),
  });
}

export type ResetPasswordSchema = InferType<ReturnType<typeof buildResetPasswordSchema>>;
