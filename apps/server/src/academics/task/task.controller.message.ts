import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { FindTasksPayload, GroupTasksPayload } from './dto/task.dto';
import { TaskService } from './task.service';

@Controller()
@ApplyRpcErrorHandling
export class TaskControllerMessage {
  constructor(private readonly tasks: TaskService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TASK })
  @MessagePattern('academics.tasks.listMine')
  listMine(@Payload(new RpcValidationPipe()) payload: FindTasksPayload, @Ctx() context: IUserContext) {
    return this.tasks.findMine(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TASK })
  @MessagePattern('academics.tasks.listForGroup')
  listForGroup(@Payload(new RpcValidationPipe()) payload: GroupTasksPayload, @Ctx() context: IUserContext) {
    return this.tasks.findForGroup(actorFromContext(context), payload.groupId);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.TASK })
  @MessagePattern('academics.tasks.markDone')
  markDone(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.tasks.markDone(actorFromContext(context), payload.id);
  }
}
