import * as Yup from 'yup';
import { WithdrawalMethod } from '@lms-organization/shared-types';

/** Pass `useTranslations('Wallet.withdraw')` from the form component. */
export type WithdrawDialogSchemaTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string;

const IBAN_MIN_LENGTH = 10;

export function buildWithdrawAmountSchema(t: WithdrawDialogSchemaTranslate) {
  return Yup.object({
    amount: Yup.number()
      .typeError(t('schema.amountTypeError'))
      .positive(t('schema.amountPositive'))
      .required(t('schema.amountRequired')),
  });
}

export type WithdrawAmountValues = Yup.InferType<ReturnType<typeof buildWithdrawAmountSchema>>;

export function buildMobileWalletDetailsSchema(t: WithdrawDialogSchemaTranslate) {
  return Yup.object({
    phoneNumber: Yup.string()
      .matches(/^\+?[0-9]{8,15}$/, t('schema.phoneInvalid'))
      .required(t('schema.phoneRequired')),
    providerName: Yup.string().required(t('schema.providerNameRequired')),
  });
}

export function buildBankTransferDetailsSchema(t: WithdrawDialogSchemaTranslate) {
  return Yup.object({
    iban: Yup.string()
      .min(IBAN_MIN_LENGTH, t('schema.ibanMin', { min: IBAN_MIN_LENGTH }))
      .required(t('schema.ibanRequired')),
    bankName: Yup.string().required(t('schema.bankNameRequired')),
    accountHolderName: Yup.string().required(t('schema.accountHolderNameRequired')),
  });
}

export function buildCreditCardDetailsSchema(t: WithdrawDialogSchemaTranslate) {
  return Yup.object({
    cardHolderName: Yup.string().required(t('schema.cardHolderNameRequired')),
    cardLastFour: Yup.string()
      .matches(/^[0-9]{4}$/, t('schema.cardLastFourInvalid'))
      .required(t('schema.cardLastFourRequired')),
  });
}

export function buildWithdrawMethodSchema(t: WithdrawDialogSchemaTranslate) {
  return Yup.object({
    method: Yup.mixed<WithdrawalMethod>()
      .oneOf(Object.values(WithdrawalMethod))
      .required(t('schema.methodRequired')),
  });
}

export type WithdrawMethodValues = Yup.InferType<ReturnType<typeof buildWithdrawMethodSchema>>;

export const withdrawNoteSchema = Yup.object({
  userNote: Yup.string().optional(),
});

export type WithdrawNoteValues = Yup.InferType<typeof withdrawNoteSchema>;
