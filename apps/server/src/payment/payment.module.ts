import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentHttpController } from './controllers/payment.http.controller';
import { PaymentMessageController } from './controllers/payment.message.controller';
import { PaymobHttpController } from './controllers/paymob/paymob.http.controller';
import { PaymentOrchestratorService } from './services/payment-orchestrator.service';
import { PaymobWebhookService } from './services/paymob-webhook.service';
import { PaymobStrategy } from './strategies/paymob/paymob.strategy';
import { PaypalStrategy } from './strategies/paypal/paypal.strategy';
import { WalletModule } from 'src/wallet/wallet.module';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { KashierStrategy } from './strategies/kashier/kashier.strategy';
import { PaddleStrategy } from './strategies/paddle/paddle.strategy';
import { LemonSqueezyStrategy } from './strategies/lemon-squeezy/lemon-squeezy.strategy';
import { EnrollmentModule } from 'src/enrollment/enrollment.module';
import { OrganizationModule } from 'src/organization/organization.module';
import { DatabaseModule } from 'src/database/database.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { CourseModule } from 'src/course/course.module';
import { UserModule } from 'src/user/user.module';
import { PrivateSessionModule } from 'src/private-session/private-session.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { AiSubscriptionModule } from 'src/ai-subscription/ai-subscription.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    RoleModule,
    forwardRef(() => EnrollmentModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => WalletModule),
    DatabaseModule,
    SubscriptionModule,
    AiSubscriptionModule,
    forwardRef(() => CourseModule),
    forwardRef(() => UserModule),
    forwardRef(() => PrivateSessionModule),
    TransactionModule,
  ],
  controllers: [PaymentMessageController, PaymentHttpController, PaymobHttpController],
  providers: [
    PaymentOrchestratorService,
    PaymobWebhookService,
    PaymobStrategy,
    PaypalStrategy,
    KashierStrategy,
    PaddleStrategy,
    LemonSqueezyStrategy,
  ],
  exports: [PaymentOrchestratorService],
})
export class PaymentModule implements OnModuleInit {
  constructor(
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly paymobStrategy: PaymobStrategy,
    private readonly paypalStrategy: PaypalStrategy,
    private readonly kashierStrategy: KashierStrategy,
    private readonly paddleStrategy: PaddleStrategy,
    private readonly lemonSqueezyStrategy: LemonSqueezyStrategy
  ) {}

  onModuleInit() {
    this.orchestrator.registerStrategy(this.paymobStrategy);
    this.orchestrator.registerStrategy(this.paypalStrategy);
    this.orchestrator.registerStrategy(this.kashierStrategy);
    this.orchestrator.registerStrategy(this.paddleStrategy);
    this.orchestrator.registerStrategy(this.lemonSqueezyStrategy);
  }
}
