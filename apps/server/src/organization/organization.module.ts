import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './entities/organization.entity';
import { OrganizationControllerMessage } from './organization.controller.message';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { OrganizationStatsListener } from './events/organization-stats.listener';

@Module({
  imports: [MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }]), SubscriptionModule],
  controllers: [OrganizationController, OrganizationControllerMessage],
  providers: [OrganizationService, OrganizationStatsListener],
  exports: [MongooseModule, OrganizationService],
})
export class OrganizationModule {}
