import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Actions, Subjects } from '@darnozom/shared-types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { AgeRangeService } from './age-range.service';
import { CreateAgeRangeDto } from './dto/create-age-range.dto';
import { UpdateAgeRangeDto } from './dto/update-age-range.dto';

@Controller('age-range')
export class AgeRangeController {
  constructor(private readonly ageRangeService: AgeRangeService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.AGE_RANGE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Post()
  create(@Body() createAgeRangeDto: CreateAgeRangeDto, @Request() req: IUserRequest) {
    return this.ageRangeService.create(createAgeRangeDto, req.user?._id?.toString());
  }

  @Get()
  findAll() {
    return this.ageRangeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ageRangeService.findOne(id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.AGE_RANGE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgeRangeDto: UpdateAgeRangeDto) {
    return this.ageRangeService.update(id, updateAgeRangeDto);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.AGE_RANGE })
  @UseGuards(AuthGuard, PlatformAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.ageRangeService.remove(id, req.user?._id?.toString());
  }
}
