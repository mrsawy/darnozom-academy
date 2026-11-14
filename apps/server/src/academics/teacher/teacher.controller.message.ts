import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { TeacherOverviewPayload } from './dto/teacher.dto';
import { TeacherOverviewService } from './teacher-overview.service';

@Controller()
@ApplyRpcErrorHandling
export class TeacherControllerMessage {
  constructor(private readonly overview: TeacherOverviewService) {}

  /**
   * READ SESSION is held by teachers and every pedagogical role; the service then allows only the teacher
   * themself or pedagogical staff (INSTRUCTOR_REPORT is not held by supervisors or coordinators).
   */
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SESSION })
  @MessagePattern('academics.teachers.overview')
  getOverview(@Payload(new RpcValidationPipe()) payload: TeacherOverviewPayload, @Ctx() context: IUserContext) {
    return this.overview.overview(actorFromContext(context), payload);
  }
}
