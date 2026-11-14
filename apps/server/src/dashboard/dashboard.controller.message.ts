import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern } from '@nestjs/microservices';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from 'src/academics/common/actor';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { DashboardService } from './dashboard.service';

@Controller()
@UseGuards(AuthGuard)
@ApplyRpcErrorHandling
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @MessagePattern('dashboard.admin')
  async getAdminDashboard(@Ctx() ctx: IUserContext) {
    const actor = actorFromContext(ctx);
    const userPermissions: string[] =
      (ctx?.userPayload as unknown as { permissions?: { subject: string }[] })?.permissions?.map((p) => p.subject) ?? [];
    return this.dashboardService.getAdminCounts(actor._id, actor.organizationId, userPermissions);
  }

  @MessagePattern('dashboard.admin.overview')
  async getAdminOverview(@Ctx() ctx: IUserContext) {
    const actor = actorFromContext(ctx);
    return this.dashboardService.getAdminOverview(actor.organizationId);
  }

  @MessagePattern('dashboard.teacher')
  async getTeacherDashboard(@Ctx() ctx: IUserContext) {
    const actor = actorFromContext(ctx);
    return this.dashboardService.getTeacherDashboard(actor._id, actor.organizationId);
  }

  @MessagePattern('dashboard.parent')
  async getParentDashboard(@Ctx() ctx: IUserContext) {
    const actor = actorFromContext(ctx);
    return this.dashboardService.getParentDashboard(actor._id, actor.organizationId);
  }
}
