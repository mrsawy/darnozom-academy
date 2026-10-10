import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function MustBeEmptyWhen(
  condition: (obj: unknown) => boolean,
  validationOptions?: ValidationOptions
) {
  return function (targetObject: object, propertyName: string) {
    registerDecorator({
      name: 'mustBeEmptyWhen',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      target: (targetObject as { constructor: Function }).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object;
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
