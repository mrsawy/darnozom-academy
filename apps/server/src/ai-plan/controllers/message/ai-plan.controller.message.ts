import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { AiPlanService } from '../../services/ai-plan.service';
import { AiPlan } from '../../entities/ai-plan.entity';

@Controller()
@ApplyRpcErrorHandling
export class AiPlanControllerMessage {
  constructor(private readonly aiPlanService: AiPlanService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('ai-plan.findAll')
  async findAll() {
    return this.aiPlanService.findAll();
  }

  /** Public — no auth required. Returns only active AI plans for marketing/pricing pages. */
  @MessagePattern('ai-plan.findAllPublic')
  async findAllPublic() {
    return this.aiPlanService.findAllPublic();
  }

  @UseGuards(AuthGuard)
  @MessagePattern('ai-plan.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.aiPlanService.findOne(payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('ai-plan.create')
  async create(@Payload(new RpcValidationPipe()) payload: Partial<AiPlan>) {
    return this.aiPlanService.create(payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('ai-plan.update')
  async update(@Payload(new RpcValidationPipe()) payload: { id: string; data: Partial<AiPlan> }) {
    return this.aiPlanService.update(payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.PLAN })
  @UseGuards(AuthGuard)
  @MessagePattern('ai-plan.delete')
  async delete(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    await this.aiPlanService.delete(payload.id);
    return { message: 'AI plan deleted successfully' };
  }
}
