import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Validates that a quiz question's `correctOption` is an integer index that
 * actually points into that question's `options` array (0 ≤ correctOption <
 * options.length). Cross-field: reads the sibling `options` off the same object.
 */
export function IsValidCorrectOption(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidCorrectOption',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const opts = (args.object as { options?: unknown }).options;
          if (!Array.isArray(opts) || opts.length === 0) return false;
          return Number.isInteger(value) && (value as number) >= 0 && (value as number) < opts.length;
        },
        defaultMessage() {
          return 'correctOption must be an integer index within the question options';
        },
      },
    });
  };
}
