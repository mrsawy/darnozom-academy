import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Program.name, schema: ProgramSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Level.name, schema: LevelSchema },
      { name: Cohort.name, schema: CohortSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [ProgramControllerMessage, LevelControllerMessage, CohortControllerMessage],
  providers: [ProgramService, LevelService, CohortService],
})
export class AcademicsModule {}
