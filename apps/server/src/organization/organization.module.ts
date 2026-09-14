import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationControllerMessage } from './organization.controller.message';
import { RoleModule } from '../role/role.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }]), RoleModule, forwardRef(() => AuthModule)],
  controllers: [OrganizationController, OrganizationControllerMessage],
  providers: [OrganizationService],
  exports: [MongooseModule, OrganizationService],
})
export class OrganizationModule {}
