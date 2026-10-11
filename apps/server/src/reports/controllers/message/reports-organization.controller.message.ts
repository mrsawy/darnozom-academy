import { Controller, ForbiddenException, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { Subjects, Actions, CommonErrors } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { OrganizationReportsService } from '../../services/organization-reports.service';
import { GetOrganizationReportsDto } from '../../dto/get-organization-reports.dto';

@ApplyRpcErrorHandling
@Controller('reports')
export class ReportsOrganizationControllerMessage {
  constructor(private readonly organizationReportsService: OrganizationReportsService) {}

  @MessagePattern('reports.organizationDashboard')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ORGANIZATION_REPORT })
  @UseGuards(AuthGuard)
  async getOrganizationDashboard(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: GetOrganizationReportsDto) {
    const orgId = context.userPayload.organizationId;
    if (!orgId) {
      throw new ForbiddenException(CommonErrors.FORBIDDEN);
    }
    return this.organizationReportsService.getDashboard(new mongoose.Types.ObjectId(orgId), payload);
  }
}
