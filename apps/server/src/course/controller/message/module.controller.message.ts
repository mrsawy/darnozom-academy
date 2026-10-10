import { BadRequestException, Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { handleRpcError } from 'src/utils/errorHandling';
import { CreateCourseModuleDto } from '../../dto/create-course-module.dto';
import { CourseModulesService } from '../../services/module/course-modules.service';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { Actions, Subjects, UserErrors } from '@lms-organization/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';

@Controller()
@ApplyRpcErrorHandling
export class ModuleControllerMessage {
  constructor(private readonly courseModulesService: CourseModulesService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.MODULE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.createModule')
  async createModule(
    @Payload(new RpcValidationPipe())
    payload: CreateCourseModuleDto,
    @Ctx() context: IUserContext
  ) {
    try {
      const user = context.userPayload;
      if (!user.organizationId) {
        throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
      }
      payload.organizationId = user.organizationId.toString();
      payload.createdBy = user._id.toString();
      const createdModule = await this.courseModulesService.create(payload);
      return createdModule;
    } catch (error) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard(
    { action: Actions.READ, subject: Subjects.MODULE },
    { action: Actions.READ, subject: Subjects.COURSE },
    { action: Actions.READ, subject: Subjects.CONTENT }
  )
  @UseGuards(AuthGuard)
  @MessagePattern('course.getModule')
  async getModule(
    @Payload(new RpcValidationPipe())
    payload: {
      moduleId: string;
    }
  ) {
    return await this.courseModulesService.findModuleWithOrderedContents(payload.moduleId);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.MODULE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.deleteModules')
  async deleteModules(
    @Payload(new RpcValidationPipe())
    payload: { moduleIds: string[] },
    @Ctx() context: IUserContext
  ) {
    try {
      return await this.courseModulesService.deleteModules(payload.moduleIds, undefined, context.userPayload._id?.toString());
    } catch (error) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.MODULE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.deleteModule')
  async deleteModule(
    @Payload(new RpcValidationPipe())
    payload: {
      moduleId: string;
    },
    @Ctx() context: IUserContext
  ) {
    try {
      return await this.courseModulesService.deleteModule(payload.moduleId, context.userPayload._id?.toString());
    } catch (error) {
      handleRpcError(error);
    }
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.MODULE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.updateModule')
  async updateModule(
    @Payload(new RpcValidationPipe())
    payload: { moduleId: string } & Partial<CreateCourseModuleDto>,
    @Ctx() _context: IUserContext
  ) {
    const { moduleId, ...updateData } = payload;
    return await this.courseModulesService.update(moduleId, updateData);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.MODULE })
  @UseGuards(AuthGuard)
  @MessagePattern('course.reorderContents')
  async reorderContents(
    @Payload(new RpcValidationPipe())
    payload: { moduleId: string; newOrder: string[] },
    @Ctx() _context: IUserContext
  ) {
    try {
      return await this.courseModulesService.reorderContents(payload.moduleId, payload.newOrder);
    } catch (error) {
      handleRpcError(error);
    }
  }
}
