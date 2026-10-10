import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Ctx } from '@nestjs/microservices';
import { PaymentOrchestratorService } from 'src/payment/services/payment-orchestrator.service';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CreatePaymentUrlDto } from '../dto/create-payment-url.dto';
import { SubscribeToPlanValidationPipe } from '../pipes/subscribe-to-plan-validation.pipe';
import type { SubscribeToPlanPayload } from '../dto/subscribe-to-plan.interface';
import type { ISubscribeToAiPlanPayload } from '../dto/subscribe-to-ai-plan.interface';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';

@Controller('payment')
@ApplyRpcErrorHandling
export class PaymentMessageController {
  constructor(private readonly paymentOrchestrator: PaymentOrchestratorService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('payment.create-payment-url')
  async findByUser(@Payload() payload: CreatePaymentUrlDto, @Ctx() context: IUserContext) {
    return await this.paymentOrchestrator.createPaymentUrl({
      ...payload,
      user: context.userPayload,
    });
  }

  /** Initiate organization plan subscription; returns payment URL. Message: payment.subscribe-to-plan */
  @UseGuards(AuthGuard)
  @MessagePattern('payment.subscribe-to-plan')
  async subscribeToPlan(@Payload(SubscribeToPlanValidationPipe) payload: SubscribeToPlanPayload, @Ctx() context: IUserContext) {
    const organizationId = payload.organizationId ?? context.userPayload.organizationId?.toString();
    const withOrg = { ...payload, organizationId };
    return await this.paymentOrchestrator.getSubscriptionPaymentUrl(payload.provider, withOrg, context.userPayload);
  }

  /**
   * Initiate AI plan subscription; returns payment URL.
   * Supports childUserId so a parent can subscribe for a child.
   * Message: payment.subscribe-to-ai-plan
   */
  @UseGuards(AuthGuard)
  @MessagePattern('payment.subscribe-to-ai-plan')
  async subscribeToAiPlan(@Payload() payload: ISubscribeToAiPlanPayload, @Ctx() context: IUserContext) {
    return await this.paymentOrchestrator.getAiSubscriptionPaymentUrl(payload.provider, payload, context.userPayload);
  }
}
