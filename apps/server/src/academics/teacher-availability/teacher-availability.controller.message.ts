import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { PutAvailabilityDto, TeacherIdPayload } from './dto/teacher-availability.dto';
import { TeacherAvailabilityService } from './teacher-availability.service';

@Controller()
@ApplyRpcErrorHandling
export class TeacherAvailabilityControllerMessage {
  constructor(private readonly availabilityService: TeacherAvailabilityService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY })
  @MessagePattern('academics.teacherAvailability.getMine')
  getMine(@Ctx() context: IUserContext) {
    return this.availabilityService.getMine(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.TEACHER_AVAILABILITY })
  @MessagePattern('academics.teacherAvailability.putMine')
  putMine(@Payload(new RpcValidationPipe()) payload: PutAvailabilityDto, @Ctx() context: IUserContext) {
    return this.availabilityService.putMine(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.TEACHER_AVAILABILITY })
  @MessagePattern('academics.teacherAvailability.getForTeacher')
  getForTeacher(@Payload(new RpcValidationPipe()) payload: TeacherIdPayload, @Ctx() context: IUserContext) {
    return this.availabilityService.getForTeacher(actorFromContext(context), payload.teacherId);
  }
}
