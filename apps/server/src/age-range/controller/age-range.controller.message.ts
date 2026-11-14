import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { AgeRangeService } from '../age-range.service';
import { CreateAgeRangeDto } from '../dto/create-age-range.dto';
import { UpdateAgeRangeDto } from '../dto/update-age-range.dto';

@Controller()
@ApplyRpcErrorHandling
export class AgeRangeControllerMessage {
  constructor(private readonly ageRangeService: AgeRangeService) {}

  @MessagePattern('age-range.findAll')
  async findAll() {
    return this.ageRangeService.findAll();
  }

  @MessagePattern('age-range.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.ageRangeService.findOne(payload.id);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('age-range.create')
  async create(@Payload(new RpcValidationPipe()) payload: CreateAgeRangeDto, @Ctx() context: IUserContext) {
    return this.ageRangeService.create(payload, context.userPayload?._id?.toString());
  }

  /** Lets organization staff who manage levels add a range from the level's age range picker. */
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.LEVEL })
  @MessagePattern('age-range.createFromLevel')
  async createFromLevel(@Payload(new RpcValidationPipe()) payload: CreateAgeRangeDto, @Ctx() context: IUserContext) {
    return this.ageRangeService.create(payload, context.userPayload?._id?.toString());
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('age-range.update')
  async update(@Payload(new RpcValidationPipe()) payload: { id: string; data: UpdateAgeRangeDto }) {
    return this.ageRangeService.update(payload.id, payload.data);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('age-range.delete')
  async remove(@Payload(new RpcValidationPipe()) payload: { id: string }, @Ctx() context: IUserContext) {
    return this.ageRangeService.remove(payload.id, context.userPayload?._id?.toString());
  }
}
