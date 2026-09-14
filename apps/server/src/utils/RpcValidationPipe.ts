import { ValidationError, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => Object.values(error.constraints ?? {}).join(', '))
    .filter(Boolean)
    .join('; ');
}

export class RpcValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      ...options,
      transform: options?.transform ?? true,
      exceptionFactory:
        options?.exceptionFactory ??
        ((errors) => {
          return new RpcException(formatValidationErrors(errors));
        }),
      whitelist: options?.whitelist ?? true,
      forbidNonWhitelisted: options?.forbidNonWhitelisted ?? false,
    });
  }
}
