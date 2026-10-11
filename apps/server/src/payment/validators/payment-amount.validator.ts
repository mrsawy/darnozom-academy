// src/payment/validators/payment-amount.validator.ts

import { BadRequestException } from '@nestjs/common';
import { Currency } from '@darnozom/shared-types';

export class PaymentAmountValidator {
  private static readonly MIN_AMOUNTS: Record<Currency, number> = {
    [Currency.USD]: 1,
    // [Currency.EUR]: 1,
    // [Currency.AED]: 10,
    [Currency.SAR]: 10,
    // [Currency.KWD]: 10,
    // [Currency.QAR]: 10,
    [Currency.EGP]: 50,
  };

  private static readonly MAX_AMOUNTS: Record<Currency, number> = {
    [Currency.USD]: 99_999,
    // [Currency.EUR]: 99_999,
    // [Currency.AED]: 99_999_999,
    [Currency.SAR]: 99_999_999,
    // [Currency.KWD]: 99_999_999,
    // [Currency.QAR]: 99_999_999,
    [Currency.EGP]: 9_999_999_999,
  };

  static validate(amount: number, currency: Currency): void {
    const min = this.MIN_AMOUNTS[currency] || 1;
    const max = this.MAX_AMOUNTS[currency] || 1_000_000;

    if (amount < min) {
      throw new BadRequestException(`Minimum amount for ${currency} is ${min}`);
    }

    if (amount > max) {
      throw new BadRequestException(`Maximum amount for ${currency} is ${max}`);
    }

    // Check decimal places (max 2)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new BadRequestException('Amount cannot have more than 2 decimal places');
    }
  }
}
