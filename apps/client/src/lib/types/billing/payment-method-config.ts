export type PaymentMethodFieldType = 'TEXT' | 'IMAGE' | 'LINK';

export interface IPaymentMethodField {
  key: string;
  label: string;
  type: PaymentMethodFieldType;
  value: string;
  order: number;
}

export interface IPaymentMethodConfig {
  _id: string;
  key: string;
  kind: 'BUILT_IN' | 'CUSTOM';
  label: string;
  enabled: boolean;
  fields: IPaymentMethodField[];
}

export interface IPaymentMethodFieldInput {
  label: string;
  type: PaymentMethodFieldType;
  value: string;
}
