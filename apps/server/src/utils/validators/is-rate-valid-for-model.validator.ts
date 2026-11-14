import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { GroupPayModel } from '@darnozom/shared-types';

/**
 * A pay rate is a percentage for PERCENT_OF_SUBSCRIPTIONS (so at most 100) and a money amount for
 * every other model. Apply to the rate property and pass the name of the model property.
 */
export function IsRateValidForModel(modelProperty: string, validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isRateValidForModel',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      target: (target as { constructor: Function }).constructor,
      propertyName,
      constraints: [modelProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [modelProp] = args.constraints as [string];
          const model = (args.object as Record<string, unknown>)[modelProp];
          if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return false;
          return model === GroupPayModel.PERCENT_OF_SUBSCRIPTIONS ? value <= 100 : true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a non-negative number, and at most 100 for a percentage model`;
        },
      },
    });
  };
}
