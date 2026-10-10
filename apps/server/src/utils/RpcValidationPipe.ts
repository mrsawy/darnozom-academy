import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import formatValidationErrors from './validators/error-message-formatter';

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
