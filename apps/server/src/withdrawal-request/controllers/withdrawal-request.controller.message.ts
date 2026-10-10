import { Controller, ForbiddenException, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { Actions, Subjects, WithdrawalRequestErrors, WithdrawalRequestStatus } from '@lms-organization/shared-types';
import { WithdrawalRequestService } from '../services/withdrawal-request.service';
import { CreateWithdrawalRequestDto } from '../dto/create-withdrawal-request.dto';
import { UpdateWithdrawalRequestDto } from '../dto/update-withdrawal-request.dto';
import { ProcessWithdrawalRequestDto } from '../dto/process-withdrawal-request.dto';

@Controller()
@ApplyRpcErrorHandling
export class WithdrawalRequestMessageController {
  constructor(private readonly withdrawalRequestService: WithdrawalRequestService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.WITHDRAWAL_REQUEST })
  @UseGuards(AuthGuard)
  @MessagePattern('withdrawal.create')
  async create(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) dto: CreateWithdrawalRequestDto) {
    return this.withdrawalRequestService.create(context.userPayload._id.toString(), dto);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.WITHDRAWAL_REQUEST })
  @UseGuards(AuthGuard)
  @MessagePattern('withdrawal.findMyRequests')
  async findMyRequests(@Ctx() context: IUserContext, @Payload() payload: { page?: number; limit?: number }) {
    return this.withdrawalRequestService.findByUser(context.userPayload._id.toString(), payload?.page ?? 1, payload?.limit ?? 10);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.WITHDRAWAL_REQUEST })
  @UseGuards(AuthGuard)
  @MessagePattern('withdrawal.findOne')
  async findOne(@Ctx() context: IUserContext, @Payload() payload: { id: string }) {
    const userId = context.userPayload._id.toString();
    const request = await this.withdrawalRequestService.findOne(payload.id);

    // Users can only access their own requests; admins can access all
    if (request.userId.toString() !== userId) {
      const ability = context.userPayload.ability;
      if (!ability.can(Actions.READ, Subjects.ALL as never)) {
        throw new ForbiddenException(WithdrawalRequestErrors.WITHDRAWAL_REQUEST_ACCESS_DENIED);
      }
    }

    return request;
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.WITHDRAWAL_REQUEST })
  @UseGuards(AuthGuard)
  @MessagePattern('withdrawal.update')
  async update(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: { id: string } & UpdateWithdrawalRequestDto) {
    const { id, ...dto } = payload;
    return this.withdrawalRequestService.update(id, context.userPayload._id.toString(), dto);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.WITHDRAWAL_REQUEST })
  @UseGuards(AuthGuard)
  @MessagePattern('withdrawal.cancel')
  async cancel(@Ctx() context: IUserContext, @Payload() payload: { id: string }) {
    return this.withdrawalRequestService.cancel(payload.id, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.WITHDRAWAL_REQUEST })
  @UseGuards(AuthGuard)
  @MessagePattern('withdrawal.findAll')
  async findAll(@Payload() payload: { page?: number; limit?: number; status?: WithdrawalRequestStatus }) {
    return this.withdrawalRequestService.findAll(payload?.page ?? 1, payload?.limit ?? 10, payload?.status);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.WITHDRAWAL_REQUEST })
  @UseGuards(AuthGuard)
  @MessagePattern('withdrawal.process')
  async process(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: { id: string } & ProcessWithdrawalRequestDto) {
    const { id, ...dto } = payload;
    return this.withdrawalRequestService.process(id, context.userPayload._id.toString(), dto);
  }
}
