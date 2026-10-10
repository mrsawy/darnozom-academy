import { Injectable, BadRequestException } from '@nestjs/common';
import { IPaymentStrategy, PaymentProvider } from '../strategies/interfaces/payment-strategy.interface';
import { PaymobStrategy } from '../strategies/paymob/paymob.strategy';
import { PaypalStrategy } from '../strategies/paypal/paypal.strategy';
import { QueryService } from 'src/database/query';

/**
 * Factory pattern for creating payment strategies
 * Alternative approach to dependency injection registration
 */
@Injectable()
export class PaymentStrategyFactory {
  constructor(private readonly queryService: QueryService) {}

  createStrategy(provider: PaymentProvider): IPaymentStrategy {
    switch (provider) {
      case PaymentProvider.PAYMOB: {
        return new PaymobStrategy(this.queryService);
      }

      case PaymentProvider.PAYPAL: {
        return new PaypalStrategy();
      }

      // Easy to add new providers
      case PaymentProvider.STRIPE: {
        // return new StripeStrategy(this.configService);
        throw new BadRequestException('Stripe not yet implemented');
      }

      default: {
        throw new BadRequestException(`Payment provider ${provider} is not supported`);
      }
    }
  }

  /**
   * Get all available strategies
   */
  getAllStrategies(): IPaymentStrategy[] {
    return [new PaymobStrategy(this.queryService), new PaypalStrategy()];
  }
}
