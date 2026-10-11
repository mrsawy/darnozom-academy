import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from '../common/actor';
import { IdPayload } from '../common/payloads';
import { CourseIdPayload, CreateProgramDto, LinkCoursePayload, UpdateProgramPayload } from './dto/program.dto';
import { ProgramService } from './program.service';

@Controller()
@ApplyRpcErrorHandling
export class ProgramControllerMessage {
  constructor(private readonly programService: ProgramService) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.findAll')
  findAll(@Ctx() context: IUserContext) {
    return this.programService.findAll(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.findOne')
  findOne(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.programService.findOne(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.create')
  create(@Payload(new RpcValidationPipe()) payload: CreateProgramDto, @Ctx() context: IUserContext) {
    return this.programService.create(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.update')
  update(@Payload(new RpcValidationPipe()) payload: UpdateProgramPayload, @Ctx() context: IUserContext) {
    return this.programService.update(actorFromContext(context), payload.id, payload.data);
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.delete')
  remove(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.programService.remove(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.findCourses')
  findCourses(@Payload(new RpcValidationPipe()) payload: IdPayload, @Ctx() context: IUserContext) {
    return this.programService.findCourses(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.courseOptions')
  courseOptions(@Ctx() context: IUserContext) {
    return this.programService.courseOptions(actorFromContext(context));
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.linkCourse')
  linkCourse(@Payload(new RpcValidationPipe()) payload: LinkCoursePayload, @Ctx() context: IUserContext) {
    return this.programService.linkCourse(actorFromContext(context), payload.programId, payload.courseId);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PROGRAM })
  @MessagePattern('academics.programs.unlinkCourse')
  unlinkCourse(@Payload(new RpcValidationPipe()) payload: CourseIdPayload, @Ctx() context: IUserContext) {
    return this.programService.unlinkCourse(actorFromContext(context), payload.courseId);
  }
}
