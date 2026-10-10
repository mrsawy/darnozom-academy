import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { SchoolTypeService } from './school-type.service';
import { CreateSchoolTypeDto } from './dto/create-school-type.dto';
import { UpdateSchoolTypeDto } from './dto/update-school-type.dto';

@Controller('school-type')
export class SchoolTypeController {
  constructor(private readonly schoolTypeService: SchoolTypeService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.SCHOOL_TYPE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Post()
  create(@Body() createSchoolTypeDto: CreateSchoolTypeDto, @Request() req: IUserRequest) {
    return this.schoolTypeService.create(createSchoolTypeDto, req.user?._id?.toString());
  }

  @Get()
  findAll() {
    return this.schoolTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolTypeService.findOne(id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.SCHOOL_TYPE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchoolTypeDto: UpdateSchoolTypeDto) {
    return this.schoolTypeService.update(id, updateSchoolTypeDto);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.SCHOOL_TYPE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.schoolTypeService.remove(id, req.user?._id?.toString());
  }
}
