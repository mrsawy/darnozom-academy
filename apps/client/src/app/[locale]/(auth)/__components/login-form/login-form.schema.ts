import * as Yup from 'yup';
import { InferType } from 'yup';

export function buildLoginSchema(tVal: (key: string) => string) {
  return Yup.object().shape({
    identifier: Yup.string().required(tVal('identifierRequired')),
    password: Yup.string().required(tVal('passwordRequired')),
  });
}

export type LoginSchema = InferType<ReturnType<typeof buildLoginSchema>>;
