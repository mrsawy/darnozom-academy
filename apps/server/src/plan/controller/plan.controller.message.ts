import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { PlanService } from '../plan.service';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';

@Controller()
@ApplyRpcErrorHandling
export class PlanControllerMessage {
  constructor(private readonly planService: PlanService) {}

  @MessagePattern('plan.findAll')
  async findAll() {
    return this.planService.findAll();
  }

  @MessagePattern('plan.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.planService.findOne(payload.id);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('plan.create')
  async create(@Payload(new RpcValidationPipe()) payload: CreatePlanDto) {
    return this.planService.create(payload);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('plan.update')
  async update(@Payload(new RpcValidationPipe()) payload: { id: string; data: UpdatePlanDto }) {
    return this.planService.update(payload.id, payload.data);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('plan.delete')
  async remove(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.planService.remove(payload.id);
  }
}
