import { forwardRef, Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { PlanControllerMessage } from './controller/plan.controller.message';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './entities/plan.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from '../role/role.module';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]), forwardRef(() => AuthModule), RoleModule],
  controllers: [PlanController, PlanControllerMessage],
  providers: [PlanService, PlatformAdminGuard],
  exports: [PlanService],
})
export class PlanModule {}
