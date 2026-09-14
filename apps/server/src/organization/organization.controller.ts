import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Subjects } from '@islamic-academy/shared-types';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ReviewOrganizationDto } from './dto/review-organization.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../role/guards/permissions.guard';
import { CanCreate, CanManage, CanRead, CanUpdate, CanDelete } from '../role/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { IUserRequest } from '../auth/interfaces/IUserRequest.interface';

@Controller('organization')
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @CanCreate(Subjects.ORGANIZATION)
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.create(createOrganizationDto);
  }

  @Get()
  @CanRead(Subjects.ORGANIZATION)
  findAll() {
    return this.organizationService.findAll();
  }

  @Get(':id')
  @CanRead(Subjects.ORGANIZATION)
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  @CanUpdate(Subjects.ORGANIZATION)
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @CanDelete(Subjects.ORGANIZATION)
  remove(@Param('id') id: string) {
    return this.organizationService.remove(id);
  }

  /** SUPER_ADMIN only (MANAGE ALL implies MANAGE ORGANIZATION). */
  @Patch(':id/review')
  @CanManage(Subjects.ORGANIZATION)
  review(@Param('id') id: string, @Body() reviewDto: ReviewOrganizationDto, @CurrentUser() user: IUserRequest['user']) {
    return this.organizationService.review(id, reviewDto, String(user?._id));
  }
}
