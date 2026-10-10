import { ValidationError } from '@nestjs/common';

interface FormattedError {
  property: string;
  messages?: Record<string, string>;
  children?: FormattedError[];
}

export default function formatValidationErrors(errors: ValidationError[]): FormattedError[] {
  return errors.map((error) => ({
    property: error.property,
    messages: error.constraints,
    children: error.children && error.children.length > 0 ? formatValidationErrors(error.children) : undefined,
  }));
}
