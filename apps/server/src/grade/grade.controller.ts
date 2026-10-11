import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Actions, Subjects } from '@darnozom/shared-types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { GradeService } from './grade.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Controller('grade')
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.GRADE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Post()
  create(@Body() createGradeDto: CreateGradeDto, @Request() req: IUserRequest) {
    return this.gradeService.create(createGradeDto, req.user?._id?.toString());
  }

  @Get()
  findAll() {
    return this.gradeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gradeService.findOne(id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GRADE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGradeDto: UpdateGradeDto) {
    return this.gradeService.update(id, updateGradeDto);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.GRADE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.gradeService.remove(id, req.user?._id?.toString());
  }
}
