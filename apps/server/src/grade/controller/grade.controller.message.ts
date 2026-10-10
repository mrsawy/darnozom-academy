import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { GradeService } from '../grade.service';
import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';

@Controller()
@ApplyRpcErrorHandling
export class GradeControllerMessage {
  constructor(private readonly gradeService: GradeService) {}

  @MessagePattern('grade.findAll')
  async findAll() {
    return this.gradeService.findAll();
  }

  @MessagePattern('grade.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.gradeService.findOne(payload.id);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('grade.create')
  async create(@Payload(new RpcValidationPipe()) payload: CreateGradeDto, @Ctx() context: IUserContext) {
    return this.gradeService.create(payload, context.userPayload?._id?.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('grade.update')
  async update(@Payload(new RpcValidationPipe()) payload: { id: string; data: UpdateGradeDto }) {
    return this.gradeService.update(payload.id, payload.data);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('grade.delete')
  async remove(@Payload(new RpcValidationPipe()) payload: { id: string }, @Ctx() context: IUserContext) {
    return this.gradeService.remove(payload.id, context.userPayload?._id?.toString());
  }
}
