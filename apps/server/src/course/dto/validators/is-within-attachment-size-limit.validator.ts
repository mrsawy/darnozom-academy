import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { ContentType } from '../../enum/contentType.enum';

/**
 * Caps `fileSizeBytes` for ATTACHMENT content only, without narrowing the
 * required/`@Min` checks that apply to every uploaded-file type. A plain
 * `@Max` cannot be used because a second `@ValidateIf(ATTACHMENT)` would AND
 * with the outer `@ValidateIf` and disable size validation for video/assignment
 * uploads entirely (which was the original bug this replaces).
 *
 * Non-attachment content passes unconditionally; attachments must be numeric
 * and within `maxBytes`.
 */
export function IsWithinAttachmentSizeLimit(maxBytes: number, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isWithinAttachmentSizeLimit',
      target: object.constructor,
      propertyName,
      constraints: [maxBytes],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const dto = args.object as { type?: unknown };
          if (dto.type !== ContentType.ATTACHMENT) return true;
          const [max] = args.constraints as [number];
          return typeof value === 'number' && value <= max;
        },
        defaultMessage(args: ValidationArguments) {
          const [max] = args.constraints as [number];
          return `Attachment file size cannot exceed ${Math.round(max / (1024 * 1024))} MB`;
        },
      },
    });
  };
}
