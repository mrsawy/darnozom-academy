import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function MustBeEmptyWhen(condition: (obj: Record<string, unknown>) => boolean, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'mustBeEmptyWhen',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          if (!condition(obj)) return true; // condition false => skip (other validators handle it)
          return value === undefined || value === null || (Array.isArray(value) && value.length === 0);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not be set for this role`;
        },
      },
    });
  };
}
