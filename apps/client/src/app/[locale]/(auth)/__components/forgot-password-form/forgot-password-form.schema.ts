import * as Yup from 'yup';
import { InferType } from 'yup';

export function buildForgotPasswordSchema(tVal: (key: string) => string) {
  return Yup.object().shape({
    email: Yup.string().email(tVal('emailInvalid')).required(tVal('emailRequired')),
  });
}

export type ForgotPasswordSchema = InferType<ReturnType<typeof buildForgotPasswordSchema>>;
