import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { AiSubscription, AiSubscriptionSchema } from './entities/ai-subscription.entity';
import { AiSubscriptionService } from './services/ai-subscription.service';
import { AiSubscriptionLimitGuard } from './guards/ai-subscription-limit.guard';
import { AiSubscriptionUsageListener } from './events/ai-subscription-usage.listener';
import { AiSubscriptionControllerMessage } from './controllers/message/ai-subscription.controller.message';
import { AiPlanModule } from 'src/ai-plan/ai-plan.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: AiSubscription.name, schema: AiSubscriptionSchema }]), AiPlanModule, AuthModule, RoleModule],
  controllers: [AiSubscriptionControllerMessage],
  providers: [AiSubscriptionService, AiSubscriptionLimitGuard, AiSubscriptionUsageListener],
  exports: [AiSubscriptionService, AiSubscriptionLimitGuard],
})
export class AiSubscriptionModule {}
