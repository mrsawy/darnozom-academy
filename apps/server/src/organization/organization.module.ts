import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './entities/organization.entity';
import { OrganizationControllerMessage } from './organization.controller.message';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { OrganizationStatsListener } from './events/organization-stats.listener';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }]),
    SubscriptionModule,
    // Needed by RequirePermissionsGuard (AuthGuard -> AuthService) on the settings handlers.
    // AuthModule already imports OrganizationModule, hence forwardRef.
    forwardRef(() => AuthModule),
    // Provides CaslAbilityFactory, the guard's second dependency.
    RoleModule,
  ],
  controllers: [OrganizationController, OrganizationControllerMessage],
  providers: [OrganizationService, OrganizationStatsListener],
  exports: [MongooseModule, OrganizationService],
})
export class OrganizationModule {}
