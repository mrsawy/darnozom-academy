import { Controller, ForbiddenException, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { Subjects, Actions, CommonErrors } from '@lms-organization/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { InstructorReportsService } from '../../services/instructor-reports.service';
import { GetInstructorReportsDto } from '../../dto/get-instructor-reports.dto';

@ApplyRpcErrorHandling
@Controller('reports')
export class ReportsInstructorControllerMessage {
  constructor(private readonly instructorReportsService: InstructorReportsService) {}

  @MessagePattern('reports.instructorDashboard')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.INSTRUCTOR_REPORT })
  @UseGuards(AuthGuard)
  async getInstructorDashboard(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GetInstructorReportsDto) {
    const orgId = context.userPayload.organizationId;
    if (!orgId) {
      throw new ForbiddenException(CommonErrors.FORBIDDEN);
    }
    const userId = new mongoose.Types.ObjectId(context.userPayload._id);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const username = context.userPayload.username;
    return this.instructorReportsService.getDashboard(userId, orgObjectId, username, payload);
  }
}
