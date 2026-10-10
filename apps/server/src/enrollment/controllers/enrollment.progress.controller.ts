import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { EnrollmentProgressService } from '../services/enrollment.progress.service';
import { GetContentProgressDto, RecordContentAccessDto, RecordTimeSpentDto, UpdateVideoProgressDto } from '../dto/progress.dto';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';

@Controller()
@ApplyRpcErrorHandling
export class EnrollmentProgressController {
  constructor(private readonly enrollmentProgressService: EnrollmentProgressService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.recordContentAccess')
  async recordContentAccess(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: RecordContentAccessDto
  ) {
    return await this.enrollmentProgressService.recordContentAccess(payload.enrollmentId, context.userPayload._id.toString(), payload.contentId, {
      videoPositionSeconds: payload.videoPositionSeconds,
      contentTitle: payload.contentTitle,
      contentType: payload.contentType,
    });
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.recordTimeSpent')
  async recordTimeSpent(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: RecordTimeSpentDto
  ) {
    return await this.enrollmentProgressService.recordTimeSpent(
      payload.enrollmentId,
      context.userPayload._id.toString(),
      payload.contentId,
      payload.additionalMinutes
    );
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.updateVideoProgress')
  async updateVideoProgress(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: UpdateVideoProgressDto
  ) {
    return await this.enrollmentProgressService.updateVideoProgress(
      payload.enrollmentId,
      context.userPayload._id.toString(),
      payload.contentId,
      payload.positionSeconds
    );
  }

  @UseGuards(AuthGuard)
  @MessagePattern('enrollment.getContentProgress')
  async getContentProgress(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: GetContentProgressDto
  ) {
    return await this.enrollmentProgressService.getContentProgress(payload.enrollmentId, context.userPayload._id.toString(), payload.contentId);
  }
}
