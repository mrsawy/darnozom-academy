import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PlatformAdminGuard } from 'src/admin-review/guards/platform-admin.guard';
import { RoleService } from '../../role.service';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { UpdateRoleDto } from '../../dto/update-role.dto';

@Controller()
@ApplyRpcErrorHandling
export class RoleControllerMessage {
  constructor(private readonly roleService: RoleService) {}

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('role.findAll')
  async findAll() {
    return this.roleService.findAll();
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('role.findOne')
  async findOne(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.roleService.findOne(payload.id);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('role.create')
  async create(@Payload(new RpcValidationPipe()) payload: CreateRoleDto) {
    return this.roleService.create(payload);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('role.update')
  async update(@Payload(new RpcValidationPipe()) payload: { id: string; data: UpdateRoleDto }) {
    return this.roleService.update(payload.id, payload.data);
  }

  @UseGuards(AuthGuard, PlatformAdminGuard)
  @MessagePattern('role.delete')
  async remove(@Payload(new RpcValidationPipe()) payload: { id: string }) {
    return this.roleService.remove(payload.id);
  }
}
