import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validates that this date string is on or after a sibling date property and at most one year later.
 * Apply to the "to" property and pass the name of the "from" property.
 *
 * @example
 *   class RangeDto {
 *     @IsDateString() from: string;
 *     @IsDateString() @IsWithinOneYearOf('from') to: string;
 *   }
 */
export function IsWithinOneYearOf(fromProperty: string, validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isWithinOneYearOf',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      target: (target as { constructor: Function }).constructor,
      propertyName,
      constraints: [fromProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [fromProp] = args.constraints as [string];
          const fromRaw = (args.object as Record<string, unknown>)[fromProp];
          if (typeof value !== 'string' || typeof fromRaw !== 'string') return false;

          const to = new Date(value);
          const from = new Date(fromRaw);
          if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime())) return false;
          if (from.getTime() > to.getTime()) return false;

          const maxTo = new Date(from);
          maxTo.setFullYear(maxTo.getFullYear() + 1);
          return to.getTime() <= maxTo.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          const [fromProp] = args.constraints as [string];
          return `${args.property} must be on or after ${fromProp} and within one year of it`;
        },
      },
    });
  };
}
