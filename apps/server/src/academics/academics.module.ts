import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';
import { Program, ProgramSchema } from './program/entities/program.entity';
import { ProgramService } from './program/program.service';
import { ProgramControllerMessage } from './program/program.controller.message';
import { Level, LevelSchema } from './level/entities/level.entity';
import { LevelService } from './level/level.service';
import { LevelControllerMessage } from './level/level.controller.message';
import { Cohort, CohortSchema } from './cohort/entities/cohort.entity';
import { CohortService } from './cohort/cohort.service';
import { CohortControllerMessage } from './cohort/cohort.controller.message';
import { Group, GroupSchema } from './group/entities/group.entity';
import { GroupStateService } from './group/group-state.service';
import { GroupService } from './group/group.service';
import { GroupTeacherService } from './group/group-teacher.service';
import { GroupStudentsService } from './group/group-students.service';
import { GroupControllerMessage } from './group/group.controller.message';
import { TeacherAvailability, TeacherAvailabilitySchema } from './teacher-availability/entities/teacher-availability.entity';
import { TeacherAvailabilityService } from './teacher-availability/teacher-availability.service';
import { TeacherAvailabilityControllerMessage } from './teacher-availability/teacher-availability.controller.message';
import { FollowUp, FollowUpSchema } from './follow-up/entities/follow-up.entity';
import { Task, TaskSchema } from './task/entities/task.entity';
import { TaskClosingService } from './task/task-closing.service';
import { TaskGenerationService } from './task/task-generation.service';
import { TaskNotificationService } from './task/task-notification.service';
import { TaskRiskService } from './task/task-risk.service';
import { TaskUserService } from './task/task-user.service';
import { FollowUpService } from './follow-up/follow-up.service';
import { Session, SessionSchema } from './session/entities/session.entity';
import { GroupStartService } from './session/group-start.service';
import { SessionAttendanceService } from './session/session-attendance.service';
import { SessionCompletionService } from './session/session-completion.service';
import { SessionQueryService } from './session/session-query.service';
import { SessionReportService } from './session/session-report.service';
import { SessionStateService } from './session/session-state.service';
import { SessionStatusProcessor } from './session/session-status.processor';
import { SessionStatusScheduler } from './session/session-status.scheduler';
import { SessionControllerMessage } from './session/session.controller.message';
import { SESSION_STATUS_QUEUE } from './session/session.queue';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Program.name, schema: ProgramSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Level.name, schema: LevelSchema },
      { name: Cohort.name, schema: CohortSchema },
      { name: Group.name, schema: GroupSchema },
      { name: TeacherAvailability.name, schema: TeacherAvailabilitySchema },
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: FollowUp.name, schema: FollowUpSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    BullModule.registerQueue({ name: SESSION_STATUS_QUEUE }),
    NotificationModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    RoleModule,
  ],
  controllers: [
    ProgramControllerMessage,
    LevelControllerMessage,
    CohortControllerMessage,
    TeacherAvailabilityControllerMessage,
    GroupControllerMessage,
    SessionControllerMessage,
  ],
  providers: [
    ProgramService,
    LevelService,
    CohortService,
    TeacherAvailabilityService,
    GroupStateService,
    GroupService,
    GroupTeacherService,
    GroupStudentsService,
    SessionStateService,
    GroupStartService,
    SessionQueryService,
    SessionAttendanceService,
    SessionCompletionService,
    SessionReportService,
    FollowUpService,
    SessionStatusProcessor,
    SessionStatusScheduler,
    TaskClosingService,
    TaskGenerationService,
    TaskNotificationService,
    TaskRiskService,
    TaskUserService,
  ],
})
export class AcademicsModule {}
