import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { AiPlan, AiPlanSchema } from './entities/ai-plan.entity';
import { AiPlanService } from './services/ai-plan.service';
import { AiPlanControllerMessage } from './controllers/message/ai-plan.controller.message';

@Module({
  imports: [MongooseModule.forFeature([{ name: AiPlan.name, schema: AiPlanSchema }]), AuthModule, RoleModule],
  controllers: [AiPlanControllerMessage],
  providers: [AiPlanService],
  exports: [AiPlanService, MongooseModule],
})
export class AiPlanModule {}
