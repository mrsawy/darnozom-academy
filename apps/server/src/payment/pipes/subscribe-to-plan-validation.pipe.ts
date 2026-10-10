import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import formatValidationErrors from 'src/utils/validators/error-message-formatter';
import { PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';
import { CreateSubscriptionToPlanPaymobDto } from '../dto/paymob/create-subscription-to-plan.paymob.dto';
import { CreateSubscriptionToPlanPaddleDto } from '../dto/paddle/create-subscription-to-plan.paddle.dto';
import { CreateSubscriptionToPlanLemonSqueezyDto } from '../dto/lemon-squeezy/create-subscription-to-plan.lemon-squeezy.dto';
import type { SubscribeToPlanPayload } from '../dto/subscribe-to-plan.interface';

/**
 * Validates subscribe-to-plan payload by provider: uses Paymob or Paddle DTO based on payload.provider.
 */
@Injectable()
export class SubscribeToPlanValidationPipe implements PipeTransform<unknown, Promise<SubscribeToPlanPayload>> {
  async transform(value: unknown): Promise<SubscribeToPlanPayload> {
    const raw = value as Record<string, unknown>;
    const provider = raw?.provider as PaymentProvider | undefined;

    if (!provider) {
      throw new RpcException(
        formatValidationErrors([{ property: 'provider', constraints: { isEnum: 'provider must be PAYMOB, PADDLE or LEMON_SQUEEZY' } }])
      );
    }

    const transformOptions = {
      enableImplicitConversion: true as const,
      exposeDefaultValues: true as const,
    };

    if (provider === PaymentProvider.PAYMOB) {
      const instance = plainToInstance(CreateSubscriptionToPlanPaymobDto, raw, transformOptions);
      const errors = await validate(instance, { whitelist: true });
      if (errors.length > 0) {
        throw new RpcException(formatValidationErrors(errors));
      }
      return instance;
    }

    if (provider === PaymentProvider.PADDLE) {
      const instance = plainToInstance(CreateSubscriptionToPlanPaddleDto, raw, transformOptions);
      const errors = await validate(instance, { whitelist: true });
      if (errors.length > 0) {
        throw new RpcException(formatValidationErrors(errors));
      }
      return instance;
    }

    if (provider === PaymentProvider.LEMON_SQUEEZY) {
      const instance = plainToInstance(CreateSubscriptionToPlanLemonSqueezyDto, raw, transformOptions);
      const errors = await validate(instance, { whitelist: true });
      if (errors.length > 0) {
        throw new RpcException(formatValidationErrors(errors));
      }
      return instance;
    }

    throw new BadRequestException(`Subscribe-to-plan is not supported for provider: ${provider}`);
  }
}
