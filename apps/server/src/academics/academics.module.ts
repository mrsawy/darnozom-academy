import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
import { GroupControllerMessage } from './group/group.controller.message';
import { TeacherAvailability, TeacherAvailabilitySchema } from './teacher-availability/entities/teacher-availability.entity';
import { TeacherAvailabilityService } from './teacher-availability/teacher-availability.service';
import { TeacherAvailabilityControllerMessage } from './teacher-availability/teacher-availability.controller.message';

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
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    RoleModule,
  ],
  controllers: [ProgramControllerMessage, LevelControllerMessage, CohortControllerMessage, TeacherAvailabilityControllerMessage, GroupControllerMessage],
  providers: [ProgramService, LevelService, CohortService, TeacherAvailabilityService, GroupStateService, GroupService, GroupTeacherService],
})
export class AcademicsModule {}
