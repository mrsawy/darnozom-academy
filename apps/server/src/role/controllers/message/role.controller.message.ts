import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoleService } from '../../role.service';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { UpdateRoleDto } from '../../dto/update-role.dto';
import { RpcValidationPipe } from '../../../utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from '../../../utils/decorators/apply-rpc-error-handling.decorator';

@ApplyRpcErrorHandling
@Controller()
export class RoleControllerMessage {
  constructor(private readonly roleService: RoleService) {}

  @MessagePattern('role.create')
  create(@Payload(new RpcValidationPipe()) createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @MessagePattern('role.findAll')
  findAll() {
    return this.roleService.findAll();
  }

  @MessagePattern('role.findOne')
  findOne(@Payload('name') name: string) {
    return this.roleService.findOne(name);
  }

  @MessagePattern('role.update')
  update(@Payload() payload: { name: string; updateRoleDto: UpdateRoleDto }) {
    return this.roleService.update(payload.name, payload.updateRoleDto);
  }

  @MessagePattern('role.remove')
  remove(@Payload('name') name: string) {
    return this.roleService.remove(name);
  }
}
