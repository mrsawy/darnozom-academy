import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { isBelowMinPaidPrice, MIN_PAID_PRICE, Currency } from '@lms-organization/shared-types';

interface PricingFields {
  originalCurrency?: Currency;
  discountPercentage?: number | null;
}

/**
 * Validates that a paid price (> 0) is at least the minimum for its currency, both as listed and
 * after the sibling `discountPercentage` is applied. A price of 0 is treated as free.
 * Apply to the price property; reads `originalCurrency` and `discountPercentage` from the object.
 */
export function IsAboveMinPaidPrice(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isAboveMinPaidPrice',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      target: (target as { constructor: Function }).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'number') return true; // type is checked by @IsNumber
          const { originalCurrency, discountPercentage } = args.object as PricingFields;
          return !isBelowMinPaidPrice(value, originalCurrency, discountPercentage);
        },
        defaultMessage(args: ValidationArguments) {
          const { originalCurrency } = args.object as PricingFields;
          const min = originalCurrency ? MIN_PAID_PRICE[originalCurrency] : undefined;
          return `${args.property} (after any discount) must be at least ${min ?? 'the minimum'} ${originalCurrency ?? ''} or 0 for free`.trim();
        },
      },
    });
  };
}
