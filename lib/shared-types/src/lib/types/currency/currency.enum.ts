export enum Currency {
  EGP = 'EGP', // Egypt
  // AED = 'AED', // United Arab Emirates
  SAR = 'SAR', // Saudi Arabia
  // KWD = 'KWD', // Kuwait
  // QAR = 'QAR', // Qatar
  USD = 'USD', // United States
  // EUR = 'EUR', // Euro zone
  //eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  DEFAULT = 'EGP', // Default currency
}

export const CURRENCIES: Currency[] = [...new Set(Object.values(Currency))];

export const DEFAULT_CURRENCY = Currency.EGP;
