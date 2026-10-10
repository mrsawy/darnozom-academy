import { Controller, ForbiddenException, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { Subjects, Actions, CommonErrors } from '@lms-organization/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { OrganizationMemberReportsService } from '../../services/organization-member-reports.service';
import { GetOrganizationMemberReportsDto } from '../../dto/get-organization-member-reports.dto';

@ApplyRpcErrorHandling
@Controller('reports')
export class ReportsOrganizationMemberControllerMessage {
  constructor(private readonly organizationMemberReportsService: OrganizationMemberReportsService) {}

  @MessagePattern('reports.organizationMemberDashboard')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ORGANIZATION_MEMBER_REPORT })
  @UseGuards(AuthGuard)
  async getOrganizationMemberDashboard(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GetOrganizationMemberReportsDto) {
    const orgId = context.userPayload.organizationId;
    if (!orgId) {
      throw new ForbiddenException(CommonErrors.FORBIDDEN);
    }
    return this.organizationMemberReportsService.getDashboard(
      new mongoose.Types.ObjectId(context.userPayload._id),
      new mongoose.Types.ObjectId(orgId),
      payload
    );
  }
}
