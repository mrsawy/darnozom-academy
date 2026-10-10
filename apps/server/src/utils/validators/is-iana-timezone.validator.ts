import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { IANAZone } from 'luxon';

/**
 * Validates that the value is a real IANA timezone identifier (e.g. "Africa/Cairo").
 *
 * @example
 *   class SlotDto {
 *     @IsIanaTimeZone() timezone: string;
 *   }
 */
export function IsIanaTimeZone(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isIanaTimeZone',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      target: (target as { constructor: Function }).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && IANAZone.isValidZone(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid IANA timezone`;
        },
      },
    });
  };
}
