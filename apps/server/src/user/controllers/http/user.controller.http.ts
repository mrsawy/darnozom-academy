import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Subjects } from '@islamic-academy/shared-types';
import { UserService } from '../../services/user.service';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { AuthGuard } from '../../../auth/guards/auth.guard';
import { PermissionsGuard } from '../../../role/guards/permissions.guard';
import { CanDelete, CanRead, CanUpdate } from '../../../role/decorators/permissions.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { IUserRequest } from '../../../auth/interfaces/IUserRequest.interface';

@Controller('user')
@UseGuards(AuthGuard, PermissionsGuard)
export class UserControllerHttp {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  me(@CurrentUser() user: IUserRequest['user']) {
    return user;
  }

  @Get()
  @CanRead(Subjects.USER)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @CanRead(Subjects.USER)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @CanUpdate(Subjects.USER)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @CanDelete(Subjects.USER)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
