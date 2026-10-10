import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription, SubscriptionSchema } from './entities/subscription.entity';
import { Organization, OrganizationSchema } from '../organization/entities/organization.entity';
import { PlanModule } from '../plan/plan.module';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionAdminService } from './services/subscription.admin.service';
import { SubscriptionControllerHttp } from './controllers/http/subscription.controller.http';
import { SubscriptionControllerMessage } from './controllers/message/subscription.controller.message';
import { SubscriptionLimitGuard } from './guards/subscription-limit.guard';
import { SubscriptionUsageListener } from './events/subscription-usage.listener';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
    PlanModule,
  ],
  controllers: [SubscriptionControllerHttp, SubscriptionControllerMessage],
  providers: [SubscriptionService, SubscriptionAdminService, SubscriptionLimitGuard, SubscriptionUsageListener],
  exports: [SubscriptionService, SubscriptionAdminService, SubscriptionLimitGuard],
})
export class SubscriptionModule {}
