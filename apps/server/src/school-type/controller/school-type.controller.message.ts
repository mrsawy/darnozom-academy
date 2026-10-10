import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { SchoolTypeService } from '../school-type.service';
import { CreateSchoolTypeDto } from '../dto/create-school-type.dto';
import { UpdateSchoolTypeDto } from '../dto/update-school-type.dto';

@Controller()
@ApplyRpcErrorHandling
export class SchoolTypeControllerMessage {
  constructor(private readonly schoolTypeService: SchoolTypeService) {}

  @MessagePattern('school-type.findAll')
  async findAll() {
    return this.schoolTypeService.findAll();
  }

  @MessagePattern('school-type.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.schoolTypeService.findOne(payload.id);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('school-type.create')
  async create(@Payload(new RpcValidationPipe()) payload: CreateSchoolTypeDto, @Ctx() context: IUserContext) {
    return this.schoolTypeService.create(payload, context.userPayload?._id?.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('school-type.update')
  async update(@Payload(new RpcValidationPipe()) payload: { id: string; data: UpdateSchoolTypeDto }) {
    return this.schoolTypeService.update(payload.id, payload.data);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('school-type.delete')
  async remove(@Payload(new RpcValidationPipe()) payload: { id: string }, @Ctx() context: IUserContext) {
    return this.schoolTypeService.remove(payload.id, context.userPayload?._id?.toString());
  }
}
