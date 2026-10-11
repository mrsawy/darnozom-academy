import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PaymentOrchestratorService } from 'src/payment/services/payment-orchestrator.service';
import { PaymobWebhookService } from 'src/payment/services/paymob-webhook.service';
import { PaymentProvider } from 'src/payment/strategies/interfaces/payment-strategy.interface';
import { PaymobWebhookTransaction } from 'src/payment/types/transaction.interface';
import { PaymobWebhookMetadata } from 'src/payment/types/paymob-webhook-metadata.interface';
import { PaymentPurpose } from '@darnozom/shared-types';

@Controller('payment')
export class PaymobHttpController {
  private readonly logger = new Logger(PaymobHttpController.name);

  constructor(
    private readonly paymentOrchestrator: PaymentOrchestratorService,
    private readonly paymobWebhookService: PaymobWebhookService
  ) {}

  /**
   * POST /payment/webhook/paymob
   *
   * Receives transaction notifications from Paymob.  The handler is intentionally
   * kept thin: parsing / verification lives in PaymentOrchestratorService and the
   * actual business logic (enrollment, wallet credit) lives in PaymobWebhookService.
   */
  @Post('/webhook/paymob')
  async handlePaymobWebhook(@Body() body: PaymobWebhookTransaction) {
    this.logger.log(`Paymob webhook received – txn=${body.obj?.id} success=${body.obj?.success}`);

    const result = await this.paymentOrchestrator.processWebhook(PaymentProvider.PAYMOB, body);

    if (!result.success) {
      this.logger.warn(`Paymob payment unsuccessful – txn=${result.transactionId}`);
      return { received: true, success: false };
    }

    const { userId, courseId, billingCycle, purpose, parentId, childId, enrollmentId } = result.metadata as PaymobWebhookMetadata;

    if (enrollmentId && userId && billingCycle && purpose === PaymentPurpose.COURSE_PURCHASE) {
      return this.paymobWebhookService.handleEnrollmentRenewal(result, { userId, enrollmentId, billingCycle });
    }

    if (courseId && billingCycle && purpose === PaymentPurpose.COURSE_PURCHASE) {
      return this.paymobWebhookService.handleCoursePurchase(result, { userId, courseId, billingCycle, purpose, parentId, childId }, body);
    }

    if (userId && purpose === PaymentPurpose.WALLET_CREDIT) {
      return this.paymobWebhookService.handleWalletCredit(result, userId);
    }

    const meta = result.metadata as PaymobWebhookMetadata;
    if (purpose === PaymentPurpose.PRIVATE_SESSION_PURCHASE) {
      return this.paymobWebhookService.handlePrivateSessionPurchase(result, meta);
    }

    this.logger.warn(`Unhandled Paymob webhook – purpose=${purpose} userId=${userId}`);
    return { received: true };
  }
}
