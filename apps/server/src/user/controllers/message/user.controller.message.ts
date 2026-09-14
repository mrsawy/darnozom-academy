import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from '../../services/user.service';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { ApplyRpcErrorHandling } from '../../../utils/decorators/apply-rpc-error-handling.decorator';

@ApplyRpcErrorHandling
@Controller()
export class UserControllerMessage {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('user.findAll')
  findAll() {
    return this.userService.findAll();
  }

  @MessagePattern('user.findOne')
  findOne(@Payload('id') id: string) {
    return this.userService.findOne(id);
  }

  @MessagePattern('user.update')
  update(@Payload() payload: { id: string; updateUserDto: UpdateUserDto }) {
    return this.userService.update(payload.id, payload.updateUserDto);
  }

  @MessagePattern('user.remove')
  remove(@Payload('id') id: string) {
    return this.userService.remove(id);
  }
}
