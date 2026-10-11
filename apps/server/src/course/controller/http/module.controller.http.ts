import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { CreateCourseModuleDto } from '../../dto/create-course-module.dto';
import { CourseModulesService } from '../../services/module/course-modules.service';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';

@Controller('module')
export class ModuleControllerHttp {
  constructor(private readonly courseModulesService: CourseModulesService) {}

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.MODULE })
  @Post()
  async createModule(@Body() payload: CreateCourseModuleDto, @Req() req: IUserRequest) {
    const user = req.user;
    payload.organizationId = user.organizationId?.toString() ?? '';
    payload.createdBy = user._id?.toString() ?? '';
    const createdModule = await this.courseModulesService.create(payload);
    return createdModule;
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard(
    { action: Actions.READ, subject: Subjects.MODULE },
    { action: Actions.READ, subject: Subjects.COURSE },
    { action: Actions.READ, subject: Subjects.CONTENT }
  )
  @Get(':moduleId')
  async getModule(@Param('moduleId') moduleId: string) {
    return await this.courseModulesService.findModuleWithOrderedContents(moduleId);
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.MODULE })
  @Delete()
  async deleteModules(@Body() payload: { moduleIds: string[] }, @Req() req: IUserRequest) {
    return await this.courseModulesService.deleteModules(payload.moduleIds, undefined, req.user._id?.toString());
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.MODULE })
  @Delete(':moduleId')
  async deleteModule(@Param('moduleId') moduleId: string, @Req() req: IUserRequest) {
    return await this.courseModulesService.deleteModule(moduleId, req.user._id?.toString());
  }

  @UseGuards(AuthGuard)
  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.MODULE })
  @Patch(':moduleId/reorder')
  async reorderContents(@Param('moduleId') moduleId: string, @Body() body: { newOrder: string[] }) {
    return await this.courseModulesService.reorderContents(moduleId, body.newOrder);
  }
}
